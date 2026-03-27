from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from src.auth.deps import get_current_user
from src.db.session import get_db
from src.models.product import Product
from src.models.user import User
from src.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def _to_product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        category=product.category,
        purchase_price=product.purchase_price,
        sale_price=product.sale_price,
        stock=product.stock,
        min_stock=product.min_stock,
        status=product.status,  # type: ignore[arg-type]
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_product_response(product)


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    q: str | None = Query(default=None, description="Search by product name"),
    category: str | None = Query(default=None),
    low_stock: bool = Query(default=False, description="When true, return only stock <= min_stock"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[ProductResponse]:
    stmt: Select[tuple[Product]] = select(Product)

    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q.strip()}%"))
    if category:
        stmt = stmt.where(Product.category == category)
    if low_stock:
        stmt = stmt.where(Product.stock <= Product.min_stock)

    stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    products = db.scalars(stmt).all()
    return [_to_product_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_product_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(product, field, value)

    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_product_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

