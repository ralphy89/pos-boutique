from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

if TYPE_CHECKING:
    from src.models.sale import Sale
    from src.models.user import User


class CashRegisterExpense(Base):
    """Cash paid out during a register session (supplies, petty cash, etc.)."""

    __tablename__ = "cash_register_expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cash_register_session_id: Mapped[int] = mapped_column(
        ForeignKey("cash_register_sessions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="other")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    recorded_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    session: Mapped["CashRegisterSession"] = relationship("CashRegisterSession", back_populates="expenses")
    recorded_by: Mapped["User | None"] = relationship("User", foreign_keys=[recorded_by_user_id])


class CashRegisterSession(Base):
    __tablename__ = "cash_register_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True, default="open")
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    opened_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    closed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    opening_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    closing_balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    total_sales_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))

    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    opened_by: Mapped["User | None"] = relationship("User", foreign_keys=[opened_by_user_id])
    closed_by: Mapped["User | None"] = relationship("User", foreign_keys=[closed_by_user_id])
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="cash_register_session")
    expenses: Mapped[list["CashRegisterExpense"]] = relationship(
        "CashRegisterExpense",
        back_populates="session",
        cascade="all, delete-orphan",
    )
