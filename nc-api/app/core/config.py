"""Application settings — loaded from .env / environment."""

from __future__ import annotations

from pathlib import Path

import json

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────
    app_name: str = "NuncaCierro WhatsApp Bot"
    app_port: int = 8000
    app_host: str = "0.0.0.0"
    log_level: str = "INFO"
    debug: bool = False

    # ── Database ─────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:1234@localhost:5432/nuncacierro"
    test_database_url: str = ""  # defaults to database_url (overridable via .env)
    db_echo: bool = False

    @model_validator(mode="after")
    def ensure_async_driver(self) -> "Settings":
        """Railway inyecta DATABASE_URL sin +asyncpg — lo agregamos."""
        url = self.database_url
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            self.database_url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self

    @model_validator(mode="after")
    def guard_jwt_secret(self) -> "Settings":
        """Rechazar el default de JWT_SECRET en producción."""
        if self.jwt_secret == "change-me-in-production" and not self.debug:
            raise ValueError(
                "JWT_SECRET no fue configurado. "
                "Generá uno con: openssl rand -base64 48"
            )
        return self

    # ── Meta WhatsApp Cloud API ──────────────────────────────────────────
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_api_version: str = "v22.0"
    whatsapp_base_url: str = "https://graph.facebook.com"

    # ── Groq / LLM ───────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_max_tokens: int = 512
    groq_temperature: float = 0.7
    groq_rate_limit_rpm: int = 30

    # ── Auth ─────────────────────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production"
    admin_default_password: str = "admin"

    # ── Encryption ─────────────────────────────────────────────────────────
    encryption_key: str = ""

    # ── CORS ─────────────────────────────────────────────────────────────
    # Formato: JSON array de strings, ej: '["https://app.midominio.com"]'
    # "*" permite cualquier origen (solo para desarrollo local)
    cors_origins: list[str] = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            # Si es "*", lo dejamos como lista con "*"
            if v.strip() == "*":
                return ["*"]
            return json.loads(v)
        if isinstance(v, list):
            return v
        return ["*"]

    # ── Rate Limiting ────────────────────────────────────────────────────
    rate_limit_max_requests: int = 10
    rate_limit_window_seconds: int = 60

    # ── Anti-Spam ────────────────────────────────────────────────────────
    anti_spam_enabled: bool = True

    # ── Evolution API (WhatsApp Gateway) ─────────────────────────────────
    evo_api_key: str = ""
    evo_api_base_url: str = "http://evolution-api:8080"

    # ── Paths ────────────────────────────────────────────────────────────
    businesses_dir: Path = Path("businesses")


settings = Settings()
