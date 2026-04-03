from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Final

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.credit_transaction import CustomerCreditTransaction
from src.models.customer import Customer
from src.models.customer_credit_payment import CustomerCreditPayment

Money = Decimal
MONEY_QUANT: Final[Decimal] = Decimal("0.01")

REPAYMENT_METHODS: Final[frozenset[str]] = frozenset({"cash", "moncash", "transfer"})
CUSTOMER_ACTIVE: Final[str] = "active"


class CreditWorkflowError(Exception):
    pass


class CreditValidationError(CreditWorkflowError):
    pass


class CustomerNotFoundForCreditError(CreditWorkflowError):
    def __init__(self, customer_id: int) -> None:
        self.customer_id = customer_id
        super().__init__(f"Customer not found: id={customer_id}")


class InactiveCustomerCreditError(CreditWorkflowError):
    def __init__(self, customer_id: int) -> None:
        self.customer_id = customer_id
        super().__init__(f"Customer is inactive: id={customer_id}")


class InvalidRepaymentMethodError(CreditWorkflowError):
    def __init__(self, method: str) -> None:
        super().__init__(
            f"Invalid repayment method {method!r}; allowed: {', '.join(sorted(REPAYMENT_METHODS))}"
        )


class OverpaymentError(CreditWorkflowError):
    def __init__(self, outstanding: Money, attempted: Money) -> None:
        self.outstanding = outstanding
        self.attempted = attempted
        super().__init__(
            f"Payment {attempted} exceeds outstanding balance {outstanding}"
        )


def _money(value: Decimal) -> Money:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _lock_customer(db: Session, customer_id: int) -> Customer:
    row = db.scalars(select(Customer).where(Customer.id == customer_id).with_for_update()).first()
    if row is None:
        raise CustomerNotFoundForCreditError(customer_id)
    if row.status != CUSTOMER_ACTIVE:
        raise InactiveCustomerCreditError(customer_id)
    return row


@dataclass(frozen=True)
class RecordCreditPaymentResult:
    payment: CustomerCreditPayment
    customer: Customer


def record_credit_payment(
    db: Session,
    *,
    customer_id: int,
    amount: Money,
    payment_method: str,
    note: str = "",
    cash_register_session_id: int | None = None,
) -> RecordCreditPaymentResult:
    """
    Apply a repayment: reduces customer.debt_balance, persists CustomerCreditPayment.
    Atomic commit/rollback on failure.
    """
    pm = payment_method.strip().lower()
    if pm not in REPAYMENT_METHODS:
        raise InvalidRepaymentMethodError(payment_method)

    amt = _money(Decimal(amount))
    if amt <= 0:
        raise CreditValidationError("Amount must be greater than zero")

    note_clean = (note or "").strip()
    if len(note_clean) > 2000:
        raise CreditValidationError("Note must be at most 2000 characters")

    try:
        customer = _lock_customer(db, customer_id)
        current_debt = _money(Decimal(customer.debt_balance))
        if amt > current_debt:
            raise OverpaymentError(current_debt, amt)

        new_balance = _money(current_debt - amt)
        payment = CustomerCreditPayment(
            customer_id=customer_id,
            amount=amt,
            payment_method=pm,
            note=note_clean,
            balance_after=new_balance,
            cash_register_session_id=cash_register_session_id,
        )
        db.add(payment)
        customer.debt_balance = new_balance
        db.commit()
        db.refresh(payment)
        db.refresh(customer)
        return RecordCreditPaymentResult(payment=payment, customer=customer)
    except CreditWorkflowError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def build_customer_ledger(db: Session, customer_id: int) -> list[dict]:
    """Merge credit charges (from sales) and repayments, newest first."""
    charges = db.scalars(
        select(CustomerCreditTransaction)
        .where(CustomerCreditTransaction.customer_id == customer_id)
        .order_by(CustomerCreditTransaction.created_at.desc(), CustomerCreditTransaction.id.desc())
    ).all()

    payments = db.scalars(
        select(CustomerCreditPayment)
        .where(CustomerCreditPayment.customer_id == customer_id)
        .order_by(CustomerCreditPayment.created_at.desc(), CustomerCreditPayment.id.desc())
    ).all()

    entries: list[dict] = []
    for c in charges:
        entries.append(
            {
                "kind": "charge",
                "record_id": c.id,
                "created_at": c.created_at,
                "amount": c.amount,
                "balance_after": c.balance_after,
                "sale_id": c.sale_id,
                "payment_method": None,
                "note": None,
            }
        )
    for p in payments:
        entries.append(
            {
                "kind": "payment",
                "record_id": p.id,
                "created_at": p.created_at,
                "amount": p.amount,
                "balance_after": p.balance_after,
                "sale_id": None,
                "payment_method": p.payment_method,
                "note": p.note or None,
            }
        )

    entries.sort(key=lambda x: (x["created_at"], x["record_id"]), reverse=True)
    return entries
