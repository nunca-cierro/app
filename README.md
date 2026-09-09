# NuncaCierro

Plataforma de automatización de atención al cliente multicanal para negocios colombianos. Responde mensajes de WhatsApp y Telegram usando inteligencia artificial, con dashboard de administración completo.

## Estructura del Monorepo

```
nunca-cierro/
├── nc-api/               ← Backend (FastAPI + PostgreSQL)
│   ├── app/
│   └── tests/            ← 613 tests
├── nc-dashboard/          ← Frontend (Next.js 16 + React 19)
│   ├── app/
│   ├── components/
│   ├── tests/
│   └── package.json
├── .github/               ← GitHub Actions (deploy)
├── openspec/              ← Spec-driven development specs (SDD)
├── docker-compose.yml     ← Stack completo (API, Dashboard, Caddy, Evolution, n8n)
├── Caddyfile              ← Reverse proxy + SSL (Caddy)
├── .gitignore
└── README.md
```

## ¿Qué es NuncaCierro?

Un sistema multi-tenant que permite a los negocios:

- **Conectar WhatsApp (vía Evolution API o Meta Cloud API) y Telegram** como canales
- **Dashboard Wizard**: Flujo guiado para crear Negocio → Agente IA → Conexión
- **Configurar agentes de IA** con prompts personalizados y versionados por negocio
- **Recibir y responder mensajes** automáticamente vía Groq (openai/gpt-oss-120b)
- **Gestionar todo** desde un dashboard web centralizado con métricas en vivo
- **Escalar** agregando múltiples negocios y agentes bajo una misma cuenta

## Stack

| Componente           | Tecnología                               |
| -------------------- | ---------------------------------------- |
| **API**              | FastAPI (Python 3.12)                    |
| **Base de Datos**    | PostgreSQL + SQLAlchemy + Alembic        |
| **AI**               | Groq — openai/gpt-oss-120b (default; override con `GROQ_MODEL`) |
| **WhatsApp Gateway** | Evolution API v2.x (primario) / Meta Cloud API v22 (alternativa) |
| **Telegram**         | Bot API                                  |
| **Dashboard**        | Next.js 16 + React 19 + TypeScript       |
| **UI**               | shadcn/ui + Tailwind CSS v4              |
| **API Deploy**       | Hetzner VPS (docker-compose + Caddy, SSH via GitHub Actions) |
| **Dashboard Deploy** | Mismo VPS (docker-compose + Caddy)       |

## Inicio Rápido

### Backend

```bash
cd nc-api
cp .env.example .env   # configurar credenciales
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd nc-dashboard
# crear .env si no existe:
# NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm install
pnpm run dev
```

**Dashboard:** http://localhost:3000  
**API Docs:** http://localhost:8000/docs

## Tests

```bash
# Backend (613 tests)
cd nc-api && uv run pytest

# Frontend
cd nc-dashboard && pnpm test
```

## Despliegue

Ambos servicios se despliegan desde el mismo repo sobre un **VPS en Hetzner** vía
`docker-compose.yml` (API, Dashboard, Evolution API, n8n y Caddy como reverse proxy
con SSL automático). El pipeline `deploy.yml` de GitHub Actions conecta por SSH,
hace pull del repo y levanta el stack:

| Proyecto | Plataforma | Despliegue |
| -------- | ---------- | ---------- |
| Backend  | Hetzner VPS | `docker compose` + Caddy, SSH vía `.github/workflows/deploy.yml` |
| Frontend | Hetzner VPS | `docker compose` (servicio `nc-dashboard`) + Caddy |

## Licencia

Uso interno — NuncaCierro
