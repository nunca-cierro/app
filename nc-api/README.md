# nc-api — NuncaCierro API

Backend multi-tenant de **NuncaCierro**, plataforma de automatización de atención al cliente
para negocios colombianos. Recibe mensajes de WhatsApp (vía Evolution API o Meta Cloud API)
y Telegram, los procesa con un agente de IA (Groq) y responde automáticamente.

## Stack

| Layer | Tecnología |
|-------|-----------|
| **Framework** | FastAPI 0.136+ |
| **Runtime** | Python 3.12 (vía uv) |
| **Base de datos** | PostgreSQL + SQLAlchemy Async + Alembic |
| **AI** | Groq — `openai/gpt-oss-120b` (default; override con `GROQ_MODEL`) |
| **Gateways** | Evolution API v2.x, Meta Cloud API v22.0, Telegram Bot API |
| **Config** | pydantic-settings + `.env` |
| **Encryption** | Fernet (AES-128) para credenciales de clientes |
| **Logging** | loguru |

## Estructura

```
nc-api/
├── app/
│   ├── api/                  # Endpoints (v1 y webhooks)
│   ├── core/                 # Config, seguridad, tenancy
│   ├── db/                   # Modelos, sesión, migraciones (Alembic)
│   │   └── migrations/versions/
│   ├── modules/              # Lógica de dominio por entidad
│   │   ├── agents/           # Agentes IA & prompts
│   │   ├── auth/             # Autenticación, roles, contraseñas (bcrypt)
│   │   ├── evolution/        # Integración Evolution API v2.x
│   │   ├── telegram/         # Integración Telegram
│   │   ├── tenants/          # Negocios
│   │   └── ...
│   └── main.py               # Punto de entrada de la app FastAPI
├── scripts/                  # Scripts de operación puntuales
├── tests/                    # Suite de pytest
├── pyproject.toml
└── uv.lock
```

## Ejecutar local

```bash
cd nc-api
cp .env.example .env    # configurar credenciales
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

- **Docs API:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health

## Tests

```bash
cd nc-api
uv run pytest -q
```

## Configuración (.env)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de PostgreSQL (driver `+asyncpg`) |
| `GROQ_API_KEY` | API key de Groq |
| `ENCRYPTION_KEY` | Clave para cifrar credenciales (Fernet) |
| `JWT_SECRET` | Clave para firmar tokens de sesión |
| `EVO_API_KEY` / `EVO_API_BASE_URL` | Credenciales y URL de Evolution API |

## Licencia

Uso interno — NuncaCierro