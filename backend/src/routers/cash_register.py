from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.auth.deps import get_current_user
from src.db.session import get_db
from src.models.cash_register_session import CashRegisterExpense, CashRegisterSession
from src.models.user import User
from src.schemas.cash_register import (
    CashRegisterExpenseCreate,
    CashRegisterExpenseResponse,
    CashRegisterPaymentBreakdown,
    CashRegisterSessionDetail,
    CashRegisterSessionSummary,
    CloseCashRegisterSessionRequest,
    OpenCashRegisterSessionRequest,
    SessionStatus,
)
from src.services.cash_register_service import (
    CashRegisterWorkflowError,
    ExpenseOnClosedSessionError,
    OpenSessionAlreadyExistsError,
    SessionNotFoundError,
    SessionNotOpenError,
    add_expense,
    close_session,
    get_open_session,
    open_session,
    payment_breakdown_for_session,
    total_expenses_for_session,
    total_expenses_for_sessions,
    total_expenses_from_rows,
)

router = APIRouter(prefix="/cash-register", tags=["cash-register"])


def _workflow_http(exc: CashRegisterWorkflowError) -> HTTPException:
    if isinstance(exc, SessionNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _to_summary(
    db: Session,
    row: CashRegisterSession,
    *,
    total_expenses: Decimal | None = None,
) -> CashRegisterSessionSummary:
    te = total_expenses if total_expenses is not None else total_expenses_for_session(db, row.id)
    return CashRegisterSessionSummary(
        id=row.id,
        status=row.status,
        opened_at=row.opened_at,
        closed_at=row.closed_at,
        opened_by_user_id=row.opened_by_user_id,
        closed_by_user_id=row.closed_by_user_id,
        opening_balance=row.opening_balance,
        closing_balance=row.closing_balance,
        total_sales_amount=row.total_sales_amount,
        total_expenses=te,
        notes=row.notes,
    )


def _to_detail(db: Session, row: CashRegisterSession) -> CashRegisterSessionDetail:
    exps = sorted(row.expenses, key=lambda e: (e.recorded_at, e.id), reverse=True)
    summary = _to_summary(db, row, total_expenses=total_expenses_from_rows(exps))
    return CashRegisterSessionDetail(
        **summary.model_dump(),
        expenses=[
            CashRegisterExpenseResponse(
                id=e.id,
                cash_register_session_id=e.cash_register_session_id,
                amount=e.amount,
                category=e.category,
                description=e.description,
                recorded_at=e.recorded_at,
                recorded_by_user_id=e.recorded_by_user_id,
            )
            for e in exps
        ],
    )


@router.get("/sessions/current", response_model=CashRegisterSessionSummary | None)
def get_current_session(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CashRegisterSessionSummary | None:
    row = get_open_session(db)
    if row is None:
        return None
    return _to_summary(db, row)


@router.get("/sessions/current/payment-breakdown", response_model=CashRegisterPaymentBreakdown)
def get_current_session_payment_breakdown(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CashRegisterPaymentBreakdown:
    row = get_open_session(db)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No open cash register session")
    b = payment_breakdown_for_session(db, row.id)
    return CashRegisterPaymentBreakdown(**b)


@router.post("/sessions", response_model=CashRegisterSessionSummary, status_code=status.HTTP_201_CREATED)
def open_cash_register_session(
    payload: OpenCashRegisterSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashRegisterSessionSummary:
    try:
        row = open_session(
            db,
            user_id=current_user.id,
            opening_balance=payload.opening_balance,
            notes=payload.notes,
        )
    except OpenSessionAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except CashRegisterWorkflowError as e:
        raise _workflow_http(e) from e
    return _to_summary(db, row)


@router.get("/sessions", response_model=list[CashRegisterSessionSummary])
def list_cash_register_sessions(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    status_filter: SessionStatus | None = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[CashRegisterSessionSummary]:
    stmt = select(CashRegisterSession).order_by(CashRegisterSession.opened_at.desc()).offset(skip).limit(limit)
    if status_filter is not None:
        stmt = stmt.where(CashRegisterSession.status == status_filter)
    rows = db.scalars(stmt).all()
    ids = [r.id for r in rows]
    totals = total_expenses_for_sessions(db, ids)
    return [_to_summary(db, r, total_expenses=totals[r.id]) for r in rows]


@router.get("/sessions/{session_id}", response_model=CashRegisterSessionDetail)
def get_cash_register_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CashRegisterSessionDetail:
    row = db.scalars(
        select(CashRegisterSession)
        .where(CashRegisterSession.id == session_id)
        .options(joinedload(CashRegisterSession.expenses))
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return _to_detail(db, row)


@router.get("/sessions/{session_id}/payment-breakdown", response_model=CashRegisterPaymentBreakdown)
def get_session_payment_breakdown(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CashRegisterPaymentBreakdown:
    if db.get(CashRegisterSession, session_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    b = payment_breakdown_for_session(db, session_id)
    return CashRegisterPaymentBreakdown(**b)


@router.post("/sessions/{session_id}/close", response_model=CashRegisterSessionSummary)
def close_cash_register_session(
    session_id: int,
    payload: CloseCashRegisterSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashRegisterSessionSummary:
    try:
        row = close_session(
            db,
            session_id=session_id,
            user_id=current_user.id,
            closing_balance=payload.closing_balance,
            notes=payload.notes,
        )
    except SessionNotFoundError as e:
        raise _workflow_http(e) from e
    except SessionNotOpenError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except CashRegisterWorkflowError as e:
        raise _workflow_http(e) from e
    return _to_summary(db, row)


@router.get("/sessions/{session_id}/expenses", response_model=list[CashRegisterExpenseResponse])
def list_session_expenses(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CashRegisterExpenseResponse]:
    if db.get(CashRegisterSession, session_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    stmt = (
        select(CashRegisterExpense)
        .where(CashRegisterExpense.cash_register_session_id == session_id)
        .order_by(CashRegisterExpense.recorded_at.desc(), CashRegisterExpense.id.desc())
    )
    rows = db.scalars(stmt).all()
    return [
        CashRegisterExpenseResponse(
            id=e.id,
            cash_register_session_id=e.cash_register_session_id,
            amount=e.amount,
            category=e.category,
            description=e.description,
            recorded_at=e.recorded_at,
            recorded_by_user_id=e.recorded_by_user_id,
        )
        for e in rows
    ]


@router.post(
    "/sessions/{session_id}/expenses",
    response_model=CashRegisterExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session_expense(
    session_id: int,
    payload: CashRegisterExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashRegisterExpenseResponse:
    try:
        exp = add_expense(
            db,
            session_id=session_id,
            user_id=current_user.id,
            amount=payload.amount,
            category=payload.category,
            description=payload.description,
        )
    except SessionNotFoundError as e:
        raise _workflow_http(e) from e
    except ExpenseOnClosedSessionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except CashRegisterWorkflowError as e:
        raise _workflow_http(e) from e
    return CashRegisterExpenseResponse(
        id=exp.id,
        cash_register_session_id=exp.cash_register_session_id,
        amount=exp.amount,
        category=exp.category,
        description=exp.description,
        recorded_at=exp.recorded_at,
        recorded_by_user_id=exp.recorded_by_user_id,
    )
