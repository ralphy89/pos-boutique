from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class CustomerCreditPayment(Base):
    """Repayment against customer debt (cash, MonCash, or transfer)."""

    __tablename__ = "customer_credit_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    balance_after: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    cash_register_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("cash_register_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
