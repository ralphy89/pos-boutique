from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from src.auth.deps import get_current_user
from src.db.session import get_db
from src.models.customer import Customer
from src.models.sale import Sale, SaleItem
from src.models.user import User
from src.schemas.customer import (
    CustomerCreate,
    CustomerDetailResponse,
    CustomerPurchaseHistoryItem,
    CustomerResponse,
    CustomerUpdate,
)

router = APIRouter(prefix="/customers", tags=["customers"])


def _to_customer_response(row: Customer) -> CustomerResponse:
    return CustomerResponse(
        id=row.id,
        name=row.name,
        phone=row.phone,
        address=row.address,
        note=row.note,
        credit_limit=row.credit_limit,
        status=row.status,  # type: ignore[arg-type]
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CustomerResponse:
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _to_customer_response(customer)


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    q: str | None = Query(default=None, description="Search by name or phone"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[CustomerResponse]:
    stmt: Select[tuple[Customer]] = select(Customer)
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(Customer.name.ilike(term), Customer.phone.ilike(term)))
    stmt = stmt.order_by(Customer.created_at.desc()).offset(skip).limit(limit)
    rows = db.scalars(stmt).all()
    return [_to_customer_response(c) for c in rows]


_IMMEDIATE_PAYMENT_METHODS = frozenset({"cash", "moncash", "transfer"})


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    purchase_history_limit: int = Query(default=5, ge=1, le=50),
) -> CustomerDetailResponse:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    total_purchase = db.scalar(
        select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.customer_id == customer_id)
    )
    amount_paid = db.scalar(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.customer_id == customer_id,
            Sale.payment_method.in_(_IMMEDIATE_PAYMENT_METHODS),
        )
    )

    items_count_sq = (
        select(func.count(SaleItem.id)).where(SaleItem.sale_id == Sale.id).scalar_subquery()
    )
    recent_stmt = (
        select(Sale, items_count_sq)
        .where(Sale.customer_id == customer_id)
        .order_by(Sale.created_at.desc())
        .limit(purchase_history_limit)
    )
    recent_rows = db.execute(recent_stmt).all()
    recent_purchases = [
        CustomerPurchaseHistoryItem(
            sale_id=sale.id,
            total=sale.total,
            subtotal=sale.subtotal,
            discount=sale.discount,
            payment_method=sale.payment_method,
            items_count=int(n or 0),
            created_at=sale.created_at,
        )
        for sale, n in recent_rows
    ]

    return CustomerDetailResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        address=customer.address,
        note=customer.note,
        credit_limit=customer.credit_limit,
        status=customer.status,  # type: ignore[arg-type]
        created_at=customer.created_at,
        updated_at=customer.updated_at,
        debt_balance=Decimal(customer.debt_balance),
        total_purchase=Decimal(total_purchase or 0),
        amount_paid=Decimal(amount_paid or 0),
        recent_purchases=recent_purchases,
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CustomerResponse:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(customer, field, value)

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _to_customer_response(customer)
