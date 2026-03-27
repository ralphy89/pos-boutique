from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.settings import settings
from src.db.base import Base
from src.db.session import engine
from src.routers.auth import router as auth_router
from src.routers.products import router as products_router

origins = [
   "http://localhost:5173",
]
def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(products_router)
    return app


app = create_app()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


init_db()

