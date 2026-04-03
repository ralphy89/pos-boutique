from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from src.auth.deps import get_current_user
from src.db.session import get_db
from src.models.customer import Customer
from src.models.customer_credit_payment import CustomerCreditPayment
from src.models.user import User
from src.schemas.credit import (
    CreditLedgerEntry,
    CreditPaymentCreate,
    CreditPaymentListItem,
    CreditPaymentResponse,
    CreditSummaryResponse,
    CustomerCreditLedgerResponse,
    DebtorRow,
)
from src.services.credit_service import (
    CreditWorkflowError,
    CustomerNotFoundForCreditError,
    build_customer_ledger,
    record_credit_payment,
)

router = APIRouter(prefix="/credit", tags=["credit"])


def _credit_http_error(exc: CreditWorkflowError) -> HTTPException:
    if isinstance(exc, CustomerNotFoundForCreditError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/summary", response_model=CreditSummaryResponse)
def credit_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CreditSummaryResponse:
    debt_positive = func.coalesce(Customer.debt_balance, 0) > 0
    total = db.scalar(
        select(func.coalesce(func.sum(Customer.debt_balance), 0)).where(debt_positive)
    )
    count = db.scalar(select(func.count()).select_from(Customer).where(debt_positive))
    return CreditSummaryResponse(
        total_outstanding=Decimal(total or 0),
        debtor_count=int(count or 0),
    )


@router.get("/debtors", response_model=list[DebtorRow])
def list_debtors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[DebtorRow]:
    debt_col = func.coalesce(Customer.debt_balance, 0)
    stmt = (
        select(Customer)
        .where(
                debt_col > 0,
        )
        .order_by(debt_col.desc(), Customer.name.asc())
        .offset(skip)
        .limit(limit)
    )
    rows = db.scalars(stmt).all()
    return [
        DebtorRow(
            id=c.id,
            name=c.name,
            phone=c.phone,
            debt_balance=c.debt_balance,
            credit_limit=c.credit_limit,
            status=c.status,
        )
        for c in rows
    ]


@router.get("/payments", response_model=list[CreditPaymentListItem])
def list_credit_payments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=300),
) -> list[CreditPaymentListItem]:
    stmt = (
        select(CustomerCreditPayment, Customer.name)
        .join(Customer, Customer.id == CustomerCreditPayment.customer_id)
        .order_by(CustomerCreditPayment.created_at.desc(), CustomerCreditPayment.id.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    out: list[CreditPaymentListItem] = []
    for p, customer_name in rows:
        out.append(
            CreditPaymentListItem(
                id=p.id,
                customer_id=p.customer_id,
                amount=p.amount,
                payment_method=p.payment_method,
                note=p.note,
                balance_after=p.balance_after,
                cash_register_session_id=p.cash_register_session_id,
                created_at=p.created_at,
                customer_name=customer_name,
            )
        )
    return out


@router.get("/customers/{customer_id}/ledger", response_model=CustomerCreditLedgerResponse)
def get_customer_credit_ledger(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CustomerCreditLedgerResponse:
    if db.get(Customer, customer_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    raw = build_customer_ledger(db, customer_id)
    entries = [
        CreditLedgerEntry(
            kind=e["kind"],  # type: ignore[arg-type]
            record_id=e["record_id"],
            created_at=e["created_at"],
            amount=e["amount"],
            balance_after=e["balance_after"],
            sale_id=e["sale_id"],
            payment_method=e["payment_method"],
            note=e["note"],
        )
        for e in raw
    ]
    return CustomerCreditLedgerResponse(customer_id=customer_id, entries=entries)


@router.post("/payments", response_model=CreditPaymentResponse, status_code=status.HTTP_201_CREATED)
def create_credit_payment(
    payload: CreditPaymentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CreditPaymentResponse:
    try:
        result = record_credit_payment(
            db,
            customer_id=payload.customer_id,
            amount=payload.amount,
            payment_method=payload.payment_method,
            note=payload.note,
            cash_register_session_id=payload.cash_register_session_id,
        )
    except CreditWorkflowError as e:
        raise _credit_http_error(e) from e

    p = result.payment
    return CreditPaymentResponse(
        id=p.id,
        customer_id=p.customer_id,
        amount=p.amount,
        payment_method=p.payment_method,
        note=p.note,
        balance_after=p.balance_after,
        cash_register_session_id=p.cash_register_session_id,
        created_at=p.created_at,
    )
