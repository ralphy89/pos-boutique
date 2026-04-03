from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

RepaymentMethod = Literal["cash", "moncash", "transfer"]


class CreditPaymentCreate(BaseModel):
    customer_id: int = Field(ge=1)
    amount: Decimal = Field(gt=0, decimal_places=2)
    payment_method: RepaymentMethod
    note: str = Field(default="", max_length=2000)
    cash_register_session_id: int | None = Field(default=None, ge=1)


class CreditPaymentResponse(BaseModel):
    id: int
    customer_id: int
    amount: Decimal
    payment_method: str
    note: str
    balance_after: Decimal
    cash_register_session_id: int | None
    created_at: datetime


class CreditPaymentListItem(CreditPaymentResponse):
    customer_name: str


class DebtorRow(BaseModel):
    id: int
    name: str
    phone: str
    debt_balance: Decimal
    credit_limit: Decimal | None
    status: str


class CreditSummaryResponse(BaseModel):
    total_outstanding: Decimal
    debtor_count: int


class CreditLedgerEntry(BaseModel):
    kind: Literal["charge", "payment"]
    record_id: int
    created_at: datetime
    amount: Decimal
    balance_after: Decimal
    sale_id: int | None = None
    payment_method: str | None = None
    note: str | None = None


class CustomerCreditLedgerResponse(BaseModel):
    customer_id: int
    entries: list[CreditLedgerEntry]
