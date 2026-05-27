# nc-api — NuncaCierro WhatsApp & Multi-channel API

## Project Overview

Backend API para el ecosistema **NuncaCierro**, una plataforma multi-tenant de automatización de atención al cliente. Soporta múltiples negocios, agentes de IA personalizados y canales (WhatsApp via Evolution API/Meta, Telegram).

### Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | FastAPI 0.136+ |
| **Runtime** | Python 3.12 (via uv) |
| **Database** | PostgreSQL + SQLAlchemy (Async) |
| **AI** | Groq API — LLaMA 3.3 70B Versatile |
| **Gateways** | Evolution API v2.x, Meta Cloud API v22.0, Telegram Bot API |
| **Encryption** | Fernet (AES-128) para credenciales de clientes |
| **Config** | pydantic-settings + .env |
| **Logging** | loguru |

### Architecture (Evolution API v2.x Flow)

```
                          ┌─────────────────────────────┐
                          │    Evolution API Server      │
                          └──────────┬──────────────────┘
                                     │ (1) messages.upsert
       POST /webhook/evolution/{id}  │
          ┌──────────────────────────▼──────────────────┐
          │              nc-api (FastAPI)                │
          │                                              │
          │  webhooks.py ─── rutea por platform          │
          │       │                                      │
          │  evolution/handler.py ─── pipeline IA        │
          │       │                                      │
          │       ├── Identifica Tenant & Agente         │
          │       ├── Carga historial de DB              │
          │       ├── Groq LLaMA 3.3 (Contexto Negocio)  │
          │       │                                      │
          │  evolution/adapter.py ─── envía respuesta    │
          │       │                                      │
          │       ├── Presence: "composing"              │
          │       └── Delay anti-baneo (2-3s)            │
          └──────────┬──────────────────────────────────┘
                     │ (2) /message/sendText
                     ▼
               WhatsApp User
```

### Decisiones Técnicas

**1. Multi-tenancy Real**  
Arquitectura de base de datos con aislamiento por `tenant_id`. Un usuario puede administrar múltiples negocios (Tenants), cada uno con sus propios Agentes y Conexiones de Plataforma.

**2. Abstracción de Plataformas**  
Sistema de adaptadores para soportar Evolution API, Meta Cloud API y Telegram de forma uniforme. Las credenciales sensibles (API Keys, Tokens) se guardan cifradas en la base de datos usando AES-128.

**3. Inteligencia de Negocio en Prompting**  
Cada Agente de IA tiene un `business_config` que incluye: instrucciones, información del negocio, catálogo de productos/servicios, FAQ y tono de voz. Estos prompts son versionados automáticamente.

**4. Mitigación de Baneo (Evolution API)**  
El adaptador de Evolution simula comportamiento humano enviando estado "escribiendo" y aplicando un delay configurable antes de disparar la respuesta de la IA.

### Project Structure

```
nc-api/
├── app/
│   ├── api/                 # Endpoints REST (v1, webhooks)
│   ├── core/                # Seguridad, Config, Tenancy
│   ├── db/                  # Modelos, Sesiones, Migraciones (Alembic)
│   ├── modules/             # Lógica de dominio por entidad
│   │   ├── agents/          # Agentes IA & Prompts
│   │   ├── evolution/       # Integración Evolution API v2.x
│   │   ├── telegram/        # Integración Telegram
│   │   ├── tenants/         # Gestión de Negocios
│   │   └── whatsapp/        # Meta Cloud API Legacy
│   └── main.py              # Punto de entrada
├── pyproject.toml
└── uv.lock
```

### Environment Variables

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de PostgreSQL (asyncpg) |
| `GROQ_API_KEY` | API key de Groq |
| `ENCRYPTION_KEY` | Clave para cifrar credenciales (Fernet) |
| `JWT_SECRET` | Clave para firmar tokens de sesión |
| `LOG_LEVEL` | Nivel de logging (default: INFO) |
| `WHATSAPP_VERIFY_TOKEN` | Token para Meta Webhooks (Legacy) |

### Endpoints Principales (v1)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Registro de Tenant + Usuario |
| `POST` | `/api/v1/agents` | Crear agente con `business_config` |
| `POST` | `/api/v1/platform-connections` | Vincular Evolution API / Telegram |
| `POST` | `/api/v1/platform-connections/{id}/register-evolution-webhook` | Auto-configura el webhook en Evolution |
| `GET` | `/api/v1/conversations` | Historial de chats multi-tenant |
