from __future__ import annotations

from sqlalchemy import inspect, text

from src.core.settings import settings
from src.db.session import engine


def apply_sqlite_schema_patches() -> None:
    """Add columns missing from older SQLite files (create_all does not alter existing tables)."""
    if not settings.database_url.startswith("sqlite"):
        return
    insp = inspect(engine)
    with engine.begin() as conn:
        if insp.has_table("customers"):
            col_names = {c["name"] for c in insp.get_columns("customers")}
            if "debt_balance" not in col_names:
                conn.execute(text("ALTER TABLE customers ADD COLUMN debt_balance NUMERIC(12, 2) NOT NULL DEFAULT 0"))
        if insp.has_table("sales"):
            sale_cols = {c["name"] for c in insp.get_columns("sales")}
            if "notes" not in sale_cols:
                conn.execute(text("ALTER TABLE sales ADD COLUMN notes TEXT NOT NULL DEFAULT ''"))
