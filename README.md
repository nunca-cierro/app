# NuncaCierro

Plataforma de automatización de atención al cliente multicanal para negocios colombianos. Responde mensajes de WhatsApp y Telegram usando inteligencia artificial, con dashboard de administración completo.

## Estructura del Monorepo

```
nunca-cierro/
├── nc-api/               ← Backend (FastAPI + PostgreSQL)
│   ├── app/
│   ├── tests/            ← 149 tests
│   └── Procfile          ← Railway deploy
├── nc-dashboard/          ← Frontend (Next.js + shadcn/ui)
│   ├── app/
│   ├── components/
│   ├── tests/            ← 62 tests
│   └── package.json
├── vercel.json            ← Vercel config (root: nc-dashboard)
├── .gitignore
└── README.md
```

## ¿Qué es NuncaCierro?

Un sistema que permite a los negocios:

- **Conectar WhatsApp y/o Telegram** como canales de atención
- **Configurar agentes de IA** con prompts personalizados por negocio
- **Recibir y responder mensajes** automáticamente vía Groq (LLaMA 3 70B)
- **Gestionar todo** desde un dashboard web centralizado
- **Escalar** agregando múltiples negocios, números y plataformas

## Stack

| Componente | Tecnología |
|------------|-----------|
| **API** | FastAPI (Python 3.12) |
| **Base de Datos** | PostgreSQL + SQLAlchemy + Alembic |
| **AI** | Groq — LLaMA 3 70B |
| **WhatsApp** | Meta Cloud API v22.0 |
| **Telegram** | Bot API |
| **Dashboard** | Next.js 16 + React 19 + TypeScript |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **Dashboard Deploy** | Vercel |
| **API Deploy** | Railway |

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
npm install
npm run dev
```

**Dashboard:** http://localhost:3000  
**API Docs:** http://localhost:8000/docs

## Tests

```bash
# Backend (149 tests)
cd nc-api && uv run pytest

# Frontend (62 tests)
cd nc-dashboard && npm test
```

## Despliegue

Cada proyecto se despliega de forma independiente desde el mismo repo:

| Proyecto | Plataforma | Root Directory |
|----------|-----------|---------------|
| Backend | Railway | `nc-api` |
| Frontend | Vercel | `nc-dashboard` |

> **Vercel:** Al conectar el repo, configura el **Root Directory** como `nc-dashboard` en la sección "Root Directory" del proyecto. Next.js se detecta automáticamente, no necesita `vercel.json`.

## Licencia

Uso interno — NuncaCierro
