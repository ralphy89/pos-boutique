from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.cash_register_session import CashRegisterExpense, CashRegisterSession
from src.models.sale import Sale

Money = Decimal
MONEY_QUANT = Decimal("0.01")

STATUS_OPEN = "open"
STATUS_CLOSED = "closed"

_PAYMENT_METHOD_KEYS: tuple[str, ...] = ("cash", "moncash", "transfer", "credit")


class CashRegisterWorkflowError(Exception):
    pass


class OpenSessionAlreadyExistsError(CashRegisterWorkflowError):
    pass


class SessionNotFoundError(CashRegisterWorkflowError):
    pass


class SessionNotOpenError(CashRegisterWorkflowError):
    pass


class ExpenseOnClosedSessionError(CashRegisterWorkflowError):
    pass


def _money(value: Decimal) -> Money:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def total_expenses_for_session(db: Session, session_id: int) -> Money:
    total = db.scalar(
        select(func.coalesce(func.sum(CashRegisterExpense.amount), 0)).where(
            CashRegisterExpense.cash_register_session_id == session_id
        )
    )
    return _money(Decimal(total or 0))


def total_expenses_from_rows(expenses: Sequence[CashRegisterExpense]) -> Money:
    return _money(sum((e.amount for e in expenses), Decimal("0")))


def total_expenses_for_sessions(db: Session, session_ids: Sequence[int]) -> dict[int, Money]:
    if not session_ids:
        return {}
    stmt = (
        select(CashRegisterExpense.cash_register_session_id, func.sum(CashRegisterExpense.amount))
        .where(CashRegisterExpense.cash_register_session_id.in_(session_ids))
        .group_by(CashRegisterExpense.cash_register_session_id)
    )
    sums = {sid: _money(Decimal(total or 0)) for sid, total in db.execute(stmt)}
    zero = _money(Decimal(0))
    return {i: sums.get(i, zero) for i in session_ids}


def payment_breakdown_for_session(db: Session, session_id: int) -> dict[str, Money]:
    stmt = (
        select(Sale.payment_method, func.coalesce(func.sum(Sale.total), 0))
        .where(Sale.cash_register_session_id == session_id)
        .group_by(Sale.payment_method)
    )
    raw = {row[0]: _money(Decimal(row[1] or 0)) for row in db.execute(stmt)}
    return {k: raw.get(k, _money(Decimal(0))) for k in _PAYMENT_METHOD_KEYS}


def get_open_session(db: Session) -> CashRegisterSession | None:
    return db.scalars(
        select(CashRegisterSession)
        .where(CashRegisterSession.status == STATUS_OPEN)
        .order_by(CashRegisterSession.opened_at.desc())
        .limit(1)
    ).first()


def open_session(
    db: Session,
    *,
    user_id: int,
    opening_balance: Decimal,
    notes: str,
) -> CashRegisterSession:
    if get_open_session(db) is not None:
        raise OpenSessionAlreadyExistsError("A cash register session is already open")

    ob = _money(opening_balance)
    notes_clean = notes.strip()
    if len(notes_clean) > 4000:
        raise CashRegisterWorkflowError("notes must be at most 4000 characters")

    row = CashRegisterSession(
        status=STATUS_OPEN,
        opened_by_user_id=user_id,
        opening_balance=ob,
        notes=notes_clean,
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(row)
    return row


def close_session(
    db: Session,
    *,
    session_id: int,
    user_id: int,
    closing_balance: Decimal,
    notes: str | None,
) -> CashRegisterSession:
    row = db.get(CashRegisterSession, session_id)
    if row is None:
        raise SessionNotFoundError(f"Cash register session not found: id={session_id}")
    if row.status != STATUS_OPEN:
        raise SessionNotOpenError("Session is not open")

    row.status = STATUS_CLOSED
    row.closed_at = datetime.now(UTC)
    row.closed_by_user_id = user_id
    row.closing_balance = _money(closing_balance)
    if notes is not None:
        nc = notes.strip()
        if len(nc) > 4000:
            raise CashRegisterWorkflowError("notes must be at most 4000 characters")
        row.notes = nc

    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(row)
    return row


def add_expense(
    db: Session,
    *,
    session_id: int,
    user_id: int,
    amount: Decimal,
    category: str,
    description: str,
) -> CashRegisterExpense:
    row = db.get(CashRegisterSession, session_id)
    if row is None:
        raise SessionNotFoundError(f"Cash register session not found: id={session_id}")
    if row.status != STATUS_OPEN:
        raise ExpenseOnClosedSessionError("Cannot record an expense on a closed session")

    amt = _money(amount)
    if amt <= 0:
        raise CashRegisterWorkflowError("amount must be greater than 0")

    cat = category.strip() or "other"
    if len(cat) > 64:
        raise CashRegisterWorkflowError("category must be at most 64 characters")

    desc = description.strip()
    if len(desc) > 4000:
        raise CashRegisterWorkflowError("description must be at most 4000 characters")

    exp = CashRegisterExpense(
        cash_register_session_id=session_id,
        amount=amt,
        category=cat,
        description=desc,
        recorded_by_user_id=user_id,
    )
    db.add(exp)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(exp)
    return exp
