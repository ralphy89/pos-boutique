from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

ProductStatus = Literal["active", "inactive"]


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    purchase_price: Decimal = Field(ge=0, decimal_places=2)
    sale_price: Decimal = Field(ge=0, decimal_places=2)
    stock: int = Field(ge=0)
    min_stock: int = Field(ge=0)
    status: ProductStatus = "active"


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    purchase_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    sale_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    min_stock: int | None = Field(default=None, ge=0)
    status: ProductStatus | None = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime


class LowStockRow(BaseModel):
    id: int
    name: str
    stock: int
    min_stock: int


class LowStockSummary(BaseModel):
    count: int
    items: list[LowStockRow]

