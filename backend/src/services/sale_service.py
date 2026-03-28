from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Final, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.cash_register_session import CashRegisterSession
from src.models.credit_transaction import CustomerCreditTransaction
from src.models.customer import Customer
from src.models.product import Product
from src.models.sale import Sale, SaleItem
from src.models.stock_movement import StockMovement

Money = Decimal
MONEY_QUANT: Final[Decimal] = Decimal("0.01")

ALLOWED_PAYMENT_METHODS: Final[frozenset[str]] = frozenset({"cash", "moncash", "transfer", "credit"})
PRODUCT_ACTIVE: Final[str] = "active"
CUSTOMER_ACTIVE: Final[str] = "active"
STOCK_REASON_SALE: Final[str] = "SALE"


class SaleWorkflowError(Exception):
    """Base error for the sale creation workflow (caller maps to HTTP as needed)."""


class SaleValidationError(SaleWorkflowError):
    """Input or domain rule violation before or during sale persistence."""


class EmptySaleError(SaleValidationError):
    pass


class ProductNotFoundError(SaleValidationError):
    def __init__(self, product_ids: set[int]) -> None:
        self.product_ids = product_ids
        super().__init__(f"Unknown product id(s): {sorted(product_ids)}")


class InactiveProductError(SaleValidationError):
    def __init__(self, product_id: int, name: str) -> None:
        self.product_id = product_id
        super().__init__(f"Product is inactive: {name} (id={product_id})")


class InvalidLineQuantityError(SaleValidationError):
    def __init__(self, product_id: int, quantity: int) -> None:
        self.product_id = product_id
        self.quantity = quantity
        super().__init__(f"Quantity must be greater than 0 (product_id={product_id}, quantity={quantity})")


class InsufficientStockError(SaleValidationError):
    def __init__(self, product_id: int, name: str, requested: int, available: int) -> None:
        self.product_id = product_id
        self.requested = requested
        self.available = available
        super().__init__(
            f"Insufficient stock for {name!r} (id={product_id}): need {requested}, have {available}"
        )


class InvalidPaymentMethodError(SaleValidationError):
    def __init__(self, method: str) -> None:
        self.method = method
        super().__init__(
            f"Invalid payment method {method!r}; allowed: {', '.join(sorted(ALLOWED_PAYMENT_METHODS))}"
        )


class CreditRequiresCustomerError(SaleValidationError):
    pass


class CustomerNotFoundError(SaleValidationError):
    def __init__(self, customer_id: int) -> None:
        self.customer_id = customer_id
        super().__init__(f"Customer not found: id={customer_id}")


class InactiveCustomerError(SaleValidationError):
    def __init__(self, customer_id: int, name: str) -> None:
        self.customer_id = customer_id
        super().__init__(f"Customer is inactive: {name!r} (id={customer_id})")


class DiscountExceedsSubtotalError(SaleValidationError):
    pass


class CreditLimitExceededError(SaleValidationError):
    def __init__(self, limit: Money, balance_after: Money) -> None:
        self.limit = limit
        self.balance_after = balance_after
        super().__init__(f"Credit limit {limit} would be exceeded; balance after sale would be {balance_after}")


@dataclass(frozen=True)
class SaleLineInput:
    product_id: int
    quantity: int


@dataclass(frozen=True)
class SaleCreateInput:
    customer_id: int | None
    payment_method: str
    discount: Money | None
    items: tuple[SaleLineInput, ...]
    notes: str = ""


@dataclass(frozen=True)
class SaleLineResult:
    product_id: int
    product_name: str
    quantity: int
    unit_price: Money
    line_subtotal: Money


@dataclass(frozen=True)
class CustomerSaleSummary:
    id: int
    name: str
    phone: str
    debt_balance_after: Money


@dataclass(frozen=True)
class SaleCreationResult:
    sale_id: int
    payment_method: str
    subtotal: Money
    discount: Money
    total: Money
    customer: CustomerSaleSummary | None
    items: tuple[SaleLineResult, ...]
    receipt_summary: str


def _money(value: Decimal) -> Money:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _normalize_payment_method(raw: str) -> str:
    m = raw.strip().lower()
    if m not in ALLOWED_PAYMENT_METHODS:
        raise InvalidPaymentMethodError(raw)
    return m


def _aggregate_quantities(items: tuple[SaleLineInput, ...]) -> dict[int, int]:
    acc: dict[int, int] = {}
    for line in items:
        if line.quantity <= 0:
            raise InvalidLineQuantityError(line.product_id, line.quantity)
        acc[line.product_id] = acc.get(line.product_id, 0) + line.quantity
    return acc


def _lock_products_by_id(db: Session, product_ids: list[int]) -> dict[int, Product]:
    if not product_ids:
        return {}
    stmt = select(Product).where(Product.id.in_(product_ids)).order_by(Product.id).with_for_update()
    rows = list(db.scalars(stmt).all())
    found = {p.id for p in rows}
    missing = set(product_ids) - found
    if missing:
        raise ProductNotFoundError(missing)
    return {p.id: p for p in rows}


def _validate_stock_for_lines(products: dict[int, Product], quantities: dict[int, int]) -> None:
    for pid, qty in quantities.items():
        p = products[pid]
        if p.status != PRODUCT_ACTIVE:
            raise InactiveProductError(p.id, p.name)
        if p.stock < qty:
            raise InsufficientStockError(p.id, p.name, qty, p.stock)


def _validate_stock_again_before_persist(products: dict[int, Product], quantities: dict[int, int]) -> None:
    """Repeat the same checks immediately before writes to guard against session state drift."""
    _validate_stock_for_lines(products, quantities)


def _lock_customer(db: Session, customer_id: int) -> Customer:
    stmt = select(Customer).where(Customer.id == customer_id).with_for_update()
    row = db.scalars(stmt).first()
    if row is None:
        raise CustomerNotFoundError(customer_id)
    if row.status != CUSTOMER_ACTIVE:
        raise InactiveCustomerError(customer_id, row.name)
    return row


def _normalize_discount(raw: Money | None, subtotal: Money) -> Money:
    if raw is None:
        return _money(Decimal("0"))
    d = _money(Decimal(raw))
    if d < 0:
        raise SaleValidationError("Discount cannot be negative")
    if d > subtotal:
        raise DiscountExceedsSubtotalError()
    return d


def _compute_line_rows(products: dict[int, Product], quantities: dict[int, int]) -> tuple[tuple[SaleLineResult, ...], Money]:
    lines: list[SaleLineResult] = []
    subtotal = Decimal("0")
    for pid in sorted(quantities.keys()):
        p = products[pid]
        qty = quantities[pid]
        unit = _money(Decimal(p.sale_price))
        line_sub = _money(unit * qty)
        lines.append(
            SaleLineResult(
                product_id=pid,
                product_name=p.name,
                quantity=qty,
                unit_price=unit,
                line_subtotal=line_sub,
            )
        )
        subtotal += line_sub
    subtotal = _money(subtotal)
    return (tuple(lines), subtotal)


def _assert_credit_limit(customer: Customer, additional_debt: Money) -> None:
    limit = customer.credit_limit
    if limit is None:
        return
    current = _money(Decimal(customer.debt_balance))
    projected = _money(current + additional_debt)
    if projected > _money(Decimal(limit)):
        raise CreditLimitExceededError(_money(Decimal(limit)), projected)


def _get_open_cash_session(db: Session) -> CashRegisterSession | None:
    return db.scalars(
        select(CashRegisterSession)
        .where(CashRegisterSession.status == "open")
        .order_by(CashRegisterSession.opened_at.desc())
        .limit(1)
    ).first()


def _build_receipt_summary(
    sale_id: int,
    payment_method: str,
    lines: tuple[SaleLineResult, ...],
    subtotal: Money,
    discount: Money,
    total: Money,
    customer: CustomerSaleSummary | None,
) -> str:
    parts: list[str] = [
        f"Sale #{sale_id}",
        f"Payment: {payment_method}",
        "---",
    ]
    for ln in lines:
        parts.append(f"{ln.product_name} x{ln.quantity} @ {ln.unit_price} = {ln.line_subtotal}")
    parts.append("---")
    parts.append(f"Subtotal: {subtotal}")
    if discount > 0:
        parts.append(f"Discount: -{discount}")
    parts.append(f"TOTAL: {total}")
    if customer:
        parts.append(f"Customer: {customer.name} ({customer.phone})")
    return "\n".join(parts)


def create_sale(db: Session, data: SaleCreateInput) -> SaleCreationResult:
    """
    Atomically create a sale: validate, price on server, persist lines, stock movements,
    optional credit ledger + debt, optional cash session totals.

    On success calls ``db.commit()``; on any failure ``db.rollback()``. Do not commit the
    same session again in the caller for this unit of work.
    """
    if not data.items:
        raise EmptySaleError("At least one line item is required")

    payment_method = _normalize_payment_method(data.payment_method)
    if payment_method == "credit" and data.customer_id is None:
        raise CreditRequiresCustomerError("customer_id is required for credit sales")

    quantities = _aggregate_quantities(data.items)
    product_ids = sorted(quantities.keys())

    try:
        customer: Customer | None = None
        customer_summary: CustomerSaleSummary | None = None
        products = _lock_products_by_id(db, product_ids)
        _validate_stock_for_lines(products, quantities)

        if data.customer_id is not None:
            customer = _lock_customer(db, data.customer_id)

        line_results, subtotal = _compute_line_rows(products, quantities)
        discount = _normalize_discount(data.discount, subtotal)
        total = _money(subtotal - discount)
        if total < 0:
            raise DiscountExceedsSubtotalError()

        if payment_method == "credit":
            assert customer is not None
            _assert_credit_limit(customer, total)

        _validate_stock_again_before_persist(products, quantities)

        cash_session = _get_open_cash_session(db)

        notes_clean = (data.notes or "").strip()
        if len(notes_clean) > 4000:
            raise SaleValidationError("notes must be at most 4000 characters")

        sale = Sale(
            customer_id=customer.id if customer else None,
            payment_method=payment_method,
            discount=discount,
            subtotal=subtotal,
            total=total,
            cash_register_session_id=cash_session.id if cash_session else None,
            notes=notes_clean,
        )
        db.add(sale)
        db.flush()

        for ln in line_results:
            db.add(
                SaleItem(
                    sale_id=sale.id,
                    product_id=ln.product_id,
                    product_name=ln.product_name,
                    quantity=ln.quantity,
                    unit_price=ln.unit_price,
                    line_subtotal=ln.line_subtotal,
                )
            )

        for pid, qty in quantities.items():
            product = products[pid]
            new_stock = product.stock - qty
            if new_stock < 0:
                raise InsufficientStockError(pid, product.name, qty, product.stock)
            product.stock = new_stock
            db.add(
                StockMovement(
                    product_id=pid,
                    sale_id=sale.id,
                    quantity_delta=-qty,
                    reason=STOCK_REASON_SALE,
                )
            )

        if payment_method == "credit":
            assert customer is not None
            new_debt = _money(Decimal(customer.debt_balance) + total)
            db.add(
                CustomerCreditTransaction(
                    customer_id=customer.id,
                    sale_id=sale.id,
                    amount=total,
                    balance_after=new_debt,
                )
            )
            customer.debt_balance = new_debt
            customer_summary = CustomerSaleSummary(
                id=customer.id,
                name=customer.name,
                phone=customer.phone,
                debt_balance_after=new_debt,
            )
        elif customer is not None:
            customer_summary = CustomerSaleSummary(
                id=customer.id,
                name=customer.name,
                phone=customer.phone,
                debt_balance_after=_money(Decimal(customer.debt_balance)),
            )

        if cash_session is not None:
            cash_session.total_sales_amount = _money(Decimal(cash_session.total_sales_amount) + total)

        db.flush()

        receipt = _build_receipt_summary(
            sale.id,
            payment_method,
            line_results,
            subtotal,
            discount,
            total,
            customer_summary,
        )

        result = SaleCreationResult(
            sale_id=sale.id,
            payment_method=payment_method,
            subtotal=subtotal,
            discount=discount,
            total=total,
            customer=customer_summary,
            items=line_results,
            receipt_summary=receipt,
        )
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


PaymentMethodLiteral = Literal["cash", "moncash", "transfer", "credit"]
