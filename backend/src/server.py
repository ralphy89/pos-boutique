from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.settings import settings
from src.db.base import Base
from src.db.session import engine
from src.db.seed import ensure_default_admin_user
from src.db.sqlite_compat import apply_sqlite_schema_patches
from src.models.cash_register_session import CashRegisterSession as _CashRegisterSession  # noqa: F401
from src.models.credit_transaction import CustomerCreditTransaction as _CreditTx  # noqa: F401
from src.models.customer_credit_payment import CustomerCreditPayment as _CreditPay  # noqa: F401
from src.models.customer import Customer as _CustomerModel  # noqa: F401 - register table in metadata
from src.models.sale import Sale as _Sale  # noqa: F401
from src.models.sale import SaleItem as _SaleItem  # noqa: F401
from src.models.stock_movement import StockMovement as _StockMovement  # noqa: F401
from src.routers.auth import router as auth_router
from src.routers.cash_register import router as cash_register_router
from src.routers.credit import router as credit_router
from src.routers.customers import router as customers_router
from src.routers.products import router as products_router
from src.routers.sales import router as sales_router


def _parse_cors_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_cors_origins(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(products_router)
    app.include_router(customers_router)
    app.include_router(cash_register_router)
    app.include_router(sales_router)
    app.include_router(credit_router)
    return app


app = create_app()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    apply_sqlite_schema_patches()
    ensure_default_admin_user()


init_db()

