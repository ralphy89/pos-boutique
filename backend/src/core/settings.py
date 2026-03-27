from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "POS Boutique API"
    env: str = "dev"

    database_url: str = "sqlite:///./pos_boutique.db"

    jwt_secret: str = "change-me"
    jwt_alg: str = "HS256"
    access_token_expires_minutes: int = 60


settings = Settings()

