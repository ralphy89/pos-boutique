from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

PaymentMethod = Literal["cash", "moncash", "transfer", "credit"]


class SaleLineCreate(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1)


class SaleCreate(BaseModel):
    customer_id: int | None = Field(default=None, ge=1)
    payment_method: PaymentMethod
    discount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    items: list[SaleLineCreate] = Field(min_length=1)
    notes: str = Field(default="", max_length=4000)


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    line_subtotal: Decimal


class CustomerBrief(BaseModel):
    id: int
    name: str
    phone: str


class SaleResponse(BaseModel):
    id: int
    customer_id: int | None
    customer: CustomerBrief | None
    payment_method: str
    discount: Decimal
    subtotal: Decimal
    total: Decimal
    notes: str
    cash_register_session_id: int | None
    created_at: datetime
    items: list[SaleItemResponse]


class SaleListRow(BaseModel):
    id: int
    customer_id: int | None
    payment_method: str
    discount: Decimal
    subtotal: Decimal
    total: Decimal
    notes: str
    cash_register_session_id: int | None
    created_at: datetime
    items_count: int


class SaleUpdate(BaseModel):
    notes: str | None = Field(default=None, max_length=4000)


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    sale_id: int | None
    quantity_delta: int
    reason: str
    created_at: datetime


class CreditTransactionResponse(BaseModel):
    id: int
    customer_id: int
    sale_id: int
    amount: Decimal
    balance_after: Decimal
    created_at: datetime
