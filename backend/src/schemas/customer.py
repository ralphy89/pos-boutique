from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

CustomerStatus = Literal["active", "inactive", "watch"]


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(default="", max_length=50)
    address: str = Field(default="", max_length=2000)
    note: str = Field(default="", max_length=4000)
    credit_limit: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    status: CustomerStatus = "active"


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=2000)
    note: str | None = Field(default=None, max_length=4000)
    credit_limit: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    status: CustomerStatus | None = None


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime


class CustomerPurchaseHistoryItem(BaseModel):
    """A compact sale row for customer purchase history."""

    sale_id: int
    total: Decimal = Field(decimal_places=2)
    subtotal: Decimal = Field(decimal_places=2)
    discount: Decimal = Field(decimal_places=2)
    payment_method: str
    items_count: int
    created_at: datetime


class CustomerDetailResponse(CustomerBase):
    """Single-customer payload including purchase stats and recent sales."""

    id: int
    created_at: datetime
    updated_at: datetime
    debt_balance: Decimal = Field(decimal_places=2)
    total_purchase: Decimal = Field(
        decimal_places=2,
        description="Sum of sale totals for this customer (all payment methods).",
    )
    amount_paid: Decimal = Field(
        decimal_places=2,
        description="Sum of sale totals paid at checkout (cash, moncash, transfer only; credit sales excluded).",
    )
    recent_purchases: list[CustomerPurchaseHistoryItem]
