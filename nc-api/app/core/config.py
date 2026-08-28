"""Application settings — loaded from .env / environment."""

from __future__ import annotations

from pathlib import Path

import json

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator


# ── Default LLM model ─────────────────────────────────────────────────────
# Single source of truth for the default Groq model. Groq deprecated
# `llama-3.3-70b-versatile` (shutdown 2026-08-16); per Groq docs the
# recommended replacement is `openai/gpt-oss-120b` (production-grade,
# faster and cheaper than the old default). Groq also lists
# `qwen/qwen3.6-27b` (preview) as an alternative candidate — documented
# here for visibility, NOT enabled yet: provider scope stays Groq-only
# until the multi-provider refactor. Override with GROQ_MODEL env var.
# Rollback: set GROQ_MODEL=llama-3.3-70b-versatile before 08/16/2026.
DEFAULT_GROQ_MODEL: str = "openai/gpt-oss-120b"

# Model ids already retired by Groq (verified on console.groq.com/docs/
# deprecations): agents still storing any of these values are routed to
# DEFAULT_GROQ_MODEL at runtime (defense-in-depth, see provider.py) and
# rewritten by the alembic data migration b1c2d3e4f5a6. Custom models are
# never touched.
DEPRECATED_GROQ_MODELS: tuple[str, ...] = (
    "llama-3.3-70b-versatile",   # shutdown 2026-08-16
    "llama-3.1-8b-instant",      # shutdown 2026-08-16
    "mixtral-8x7b-32768",        # retired 2025-03-20
    "gemma2-9b-it",              # retired 2025-10-08
)


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

    # ── Internal tenant ──────────────────────────────────────────────────
    # Slug of the platform's OWN tenant, exempt from payment enforcement
    # (auth/tenants responses + Evolution payment pre-processing). Change
    # this when adapting the product to another business — never hardcode a
    # slug in modules. Empty = no tenant is exempt (safe fallback).
    internal_tenant_slug: str = "nuncacierro"

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

    # ── Meta WhatsApp Cloud API ──────────────────────────────────────────
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_api_version: str = "v22.0"
    whatsapp_base_url: str = "https://graph.facebook.com"

    # ── Groq / LLM ───────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = DEFAULT_GROQ_MODEL
    groq_max_tokens: int = 1024
    groq_temperature: float = 0.7
    groq_rate_limit_rpm: int = 30

    # ── Auth ─────────────────────────────────────────────────────────────
    jwt_secret: str = ""

    @field_validator("jwt_secret", mode="after")
    @classmethod
    def require_jwt_secret(cls, v: str) -> str:
        if not v or v == "change-me-in-production":
            raise ValueError("JWT_SECRET es obligatorio. Generalo con: openssl rand -base64 48")
        return v

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

    # ── Webhook public base URL ──────────────────────────────────────────
    # Public base URL of nc-api used to build webhook callback URLs for
    # platforms that reach this API from outside (Telegram, Evolution).
    # Caddyfile maps api.{DOMAIN} → nc-api. Default = current Hetzner
    # production; override via WEBHOOK_PUBLIC_BASE_URL.
    webhook_public_base_url: str = "https://api.nuncacierro.com"

    # ── Evolution internal base URL ──────────────────────────────────────
    # Docker-internal URL used when Evolution API and nc-api share the same
    # Docker network (intentional — not exposed publicly). Override via
    # EVO_INTERNAL_BASE_URL when they live on different hosts.
    evo_internal_base_url: str = "http://nc-api:8000"

    @field_validator("webhook_public_base_url", "evo_internal_base_url", mode="before")
    @classmethod
    def strip_trailing_slash(cls, v: object) -> object:
        """Normalize configurable URLs — no trailing '/' so callback URLs
        built as f"{base}/webhook/..." never double-slash (same convention
        already applied at call sites via .rstrip('/'))."""
        if isinstance(v, str) and v.strip():
            return v.strip().rstrip("/")
        return v

    # ── Billing / Payment ────────────────────────────────────────────────
    payment_breb_number: str = ""
    payment_account_holder: str = ""
    payment_dashboard_url: str = "https://nuncacierro.com/dashboard"

    # ── Paths ────────────────────────────────────────────────────────────
    businesses_dir: Path = Path("businesses")


settings = Settings()
