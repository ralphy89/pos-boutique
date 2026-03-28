from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from src.auth.deps import get_current_user
from src.db.session import get_db
from src.models.credit_transaction import CustomerCreditTransaction
from src.models.customer import Customer
from src.models.sale import Sale, SaleItem
from src.models.stock_movement import StockMovement
from src.models.user import User
from src.schemas.sale import (
    CreditTransactionResponse,
    CustomerBrief,
    SaleCreate,
    SaleItemResponse,
    SaleListRow,
    SaleResponse,
    SaleUpdate,
    StockMovementResponse,
)
from src.services.sale_service import (
    CustomerNotFoundError,
    ProductNotFoundError,
    SaleCreateInput,
    SaleLineInput,
    SaleWorkflowError,
    create_sale,
)

router = APIRouter(prefix="/sales", tags=["sales"])


def _sale_http_error(exc: SaleWorkflowError) -> HTTPException:
    if isinstance(exc, (ProductNotFoundError, CustomerNotFoundError)):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _customer_brief(db: Session, customer_id: int | None) -> CustomerBrief | None:
    if customer_id is None:
        return None
    row = db.get(Customer, customer_id)
    if row is None:
        return None
    return CustomerBrief(id=row.id, name=row.name, phone=row.phone)


def _to_sale_response(sale: Sale, db: Session) -> SaleResponse:
    items = sorted(sale.items, key=lambda i: i.id)
    return SaleResponse(
        id=sale.id,
        customer_id=sale.customer_id,
        customer=_customer_brief(db, sale.customer_id),
        payment_method=sale.payment_method,
        discount=sale.discount,
        subtotal=sale.subtotal,
        total=sale.total,
        notes=sale.notes,
        cash_register_session_id=sale.cash_register_session_id,
        created_at=sale.created_at,
        items=[
            SaleItemResponse(
                id=it.id,
                product_id=it.product_id,
                product_name=it.product_name,
                quantity=it.quantity,
                unit_price=it.unit_price,
                line_subtotal=it.line_subtotal,
            )
            for it in items
        ],
    )


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale_endpoint(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    inp = SaleCreateInput(
        customer_id=payload.customer_id,
        payment_method=payload.payment_method,
        discount=payload.discount,
        items=tuple(SaleLineInput(product_id=x.product_id, quantity=x.quantity) for x in payload.items),
        notes=payload.notes,
    )
    try:
        result = create_sale(db, inp)
    except SaleWorkflowError as e:
        raise _sale_http_error(e) from e

    sale = db.scalars(
        select(Sale).where(Sale.id == result.sale_id).options(joinedload(Sale.items))
    ).first()
    if sale is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Sale not found after create")
    return _to_sale_response(sale, db)


def _query_sales_list(
    *,
    customer_id: int | None,
    payment_method: str | None,
    created_from: datetime | None,
    created_to: datetime | None,
    skip: int,
    limit: int,
):
    items_count_sq = (
        select(func.count(SaleItem.id)).where(SaleItem.sale_id == Sale.id).scalar_subquery()
    )
    stmt = select(Sale, items_count_sq).order_by(Sale.created_at.desc()).offset(skip).limit(limit)
    if customer_id is not None:
        stmt = stmt.where(Sale.customer_id == customer_id)
    if payment_method is not None:
        pm = payment_method.strip().lower()
        stmt = stmt.where(Sale.payment_method == pm)
    if created_from is not None:
        stmt = stmt.where(Sale.created_at >= created_from)
    if created_to is not None:
        stmt = stmt.where(Sale.created_at <= created_to)
    return stmt


def _rows_to_sale_list_rows(rows: list) -> list[SaleListRow]:
    out: list[SaleListRow] = []
    for sale, n_items in rows:
        out.append(
            SaleListRow(
                id=sale.id,
                customer_id=sale.customer_id,
                payment_method=sale.payment_method,
                discount=sale.discount,
                subtotal=sale.subtotal,
                total=sale.total,
                notes=sale.notes,
                cash_register_session_id=sale.cash_register_session_id,
                created_at=sale.created_at,
                items_count=int(n_items or 0),
            )
        )
    return out


@router.get("", response_model=list[SaleListRow])
def list_sales(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    customer_id: int | None = Query(default=None, ge=1),
    payment_method: str | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[SaleListRow]:
    stmt = _query_sales_list(
        customer_id=customer_id,
        payment_method=payment_method,
        created_from=created_from,
        created_to=created_to,
        skip=skip,
        limit=limit,
    )
    return _rows_to_sale_list_rows(list(db.execute(stmt).all()))


@router.get("/by-customer/{customer_id}", response_model=list[SaleListRow])
def list_sales_by_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    payment_method: str | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[SaleListRow]:
    if db.get(Customer, customer_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    stmt = _query_sales_list(
        customer_id=customer_id,
        payment_method=payment_method,
        created_from=created_from,
        created_to=created_to,
        skip=skip,
        limit=limit,
    )
    return _rows_to_sale_list_rows(list(db.execute(stmt).all()))


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    sale = db.scalars(
        select(Sale).where(Sale.id == sale_id).options(joinedload(Sale.items))
    ).first()
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return _to_sale_response(sale, db)


@router.patch("/{sale_id}", response_model=SaleResponse)
def update_sale_notes(
    sale_id: int,
    payload: SaleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    sale = db.scalars(
        select(Sale).where(Sale.id == sale_id).options(joinedload(Sale.items))
    ).first()
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return _to_sale_response(sale, db)

    if "notes" in updates and updates["notes"] is not None:
        sale.notes = updates["notes"].strip()

    db.add(sale)
    db.commit()
    sale = db.scalars(
        select(Sale).where(Sale.id == sale_id).options(joinedload(Sale.items))
    ).first()
    if sale is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Sale missing after update")
    return _to_sale_response(sale, db)


@router.get("/{sale_id}/movements", response_model=list[StockMovementResponse])
def list_sale_stock_movements(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[StockMovementResponse]:
    exists = db.get(Sale, sale_id)
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    stmt = (
        select(StockMovement)
        .where(StockMovement.sale_id == sale_id)
        .order_by(StockMovement.created_at.asc(), StockMovement.id.asc())
    )
    rows = db.scalars(stmt).all()
    return [
        StockMovementResponse(
            id=m.id,
            product_id=m.product_id,
            sale_id=m.sale_id,
            quantity_delta=m.quantity_delta,
            reason=m.reason,
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.get("/{sale_id}/credit", response_model=CreditTransactionResponse | None)
def get_sale_credit_transaction(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CreditTransactionResponse | None:
    if db.get(Sale, sale_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    row = db.scalars(
        select(CustomerCreditTransaction).where(CustomerCreditTransaction.sale_id == sale_id)
    ).first()
    if row is None:
        return None
    return CreditTransactionResponse(
        id=row.id,
        customer_id=row.customer_id,
        sale_id=row.sale_id,
        amount=row.amount,
        balance_after=row.balance_after,
        created_at=row.created_at,
    )
