from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.db.session import SessionLocal
from src.models.user import User

# Bootstrap account when the database is first created. Change the password after first login in production.
DEFAULT_ADMIN_EMAIL = "admin@ralphydumera.com"
DEFAULT_ADMIN_PASSWORD = "admin$89_%"


def ensure_default_admin_user() -> None:
    """Insert the default admin user if no row exists for DEFAULT_ADMIN_EMAIL."""
    db: Session = SessionLocal()
    try:
        email = DEFAULT_ADMIN_EMAIL.lower()
        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            return
        db.add(
            User(
                email=email,
                full_name="Administrator",
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                is_active=True,
                is_admin=True,
            )
        )
        db.commit()
    finally:
        db.close()
