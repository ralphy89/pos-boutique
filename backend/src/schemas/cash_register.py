from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

SessionStatus = Literal["open", "closed"]


class OpenCashRegisterSessionRequest(BaseModel):
    opening_balance: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    notes: str = Field(default="", max_length=4000)


class CloseCashRegisterSessionRequest(BaseModel):
    closing_balance: Decimal = Field(..., decimal_places=2)
    notes: str | None = Field(default=None, max_length=4000)


class CashRegisterExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    category: str = Field(default="other", max_length=64)
    description: str = Field(default="", max_length=4000)


class CashRegisterExpenseResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    cash_register_session_id: int
    amount: Decimal
    category: str
    description: str
    recorded_at: datetime
    recorded_by_user_id: int | None


class CashRegisterPaymentBreakdown(BaseModel):
    """Sum of `Sale.total` for the session, grouped by payment method."""

    cash: Decimal
    moncash: Decimal
    transfer: Decimal
    credit: Decimal


class CashRegisterSessionSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    status: str
    opened_at: datetime
    closed_at: datetime | None
    opened_by_user_id: int | None
    closed_by_user_id: int | None
    opening_balance: Decimal
    closing_balance: Decimal | None
    total_sales_amount: Decimal
    total_expenses: Decimal
    notes: str


class CashRegisterSessionDetail(CashRegisterSessionSummary):
    expenses: list[CashRegisterExpenseResponse]
