# 🚀 Deploy — NuncaCierro

> Documentación de la infraestructura y despliegue del proyecto.
> Última actualización: agosto 2026.

---

## 📋 Stack

| Componente | Tecnología |
|------------|-----------|
| **Backend** | FastAPI (Python 3.12 + uv) |
| **Frontend** | Next.js 16 (con Turbopack) |
| **Base de datos** | PostgreSQL 16 |
| **Proxy/SSL** | Caddy (auto HTTPS con Let's Encrypt) |
| **WhatsApp Gateway** | Evolution API v2.x (Node.js, interno) |
| **IA** | Groq API — OpenAI GPT-OSS 120B (default; override con `GROQ_MODEL`) |
| **Cache** | Redis 7 |
| **Contenedores** | Docker + Docker Compose |

---

## 🏗️ Estructura del proyecto

```
nunca-cierro/
├── nc-api/              # Backend FastAPI
│   ├── app/
│   │   ├── api/v1/      # Endpoints REST
│   │   │   ├── agents.py
│   │   │   ├── auth.py
│   │   │   ├── tenants.py
│   │   │   └── ...
│   │   ├── modules/
│   │   │   ├── agents/           # Agentes IA, prompts, templates
│   │   │   ├── auth/             # Usuarios, roles, JWT
│   │   │   ├── plans/            # Matriz plan → capacidades y límites
│   │   │   ├── evolution/        # Handler WhatsApp + anti-spam
│   │   │   ├── telegram/         # Handler Telegram
│   │   │   ├── tenants/          # Negocios multi-tenant
│   │   │   └── ...
│   │   ├── core/config.py        # Settings desde .env
│   │   └── db/                   # Modelos, sesiones, migraciones
│   ├── alembic/                  # Migraciones DB
│   ├── Dockerfile
│   └── pyproject.toml
├── nc-dashboard/         # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── legal/page.tsx        # Páginas legales
│   │   ├── dashboard/            # App dashboard (auth required)
│   │   │   ├── agents/           # CRUD de agentes IA
│   │   │   ├── tenants/          # CRUD de negocios
│   │   │   ├── platforms/        # Conexiones (WhatsApp, Telegram)
│   │   │   ├── conversations/    # Conversaciones
│   │   │   └── admin/users/      # Gestión de usuarios
│   │   └── auth/                 # Login / Register
│   ├── components/
│   │   ├── sections/             # Secciones de la landing
│   │   │   ├── hero/             # Hero + mockup + carrusel
│   │   │   ├── how-it-works.tsx  # Scroll sticky + neón
│   │   │   ├── businesses.tsx    # Grid de industrias
│   │   │   ├── faq.tsx           # FAQ chat + búsqueda
│   │   │   ├── contact.tsx       # Contacto + mockup
│   │   │   ├── plans.tsx         # Tabla comparativa
│   │   │   └── ...
│   │   ├── layout/               # Header, Footer, Sidebar
│   │   └── ui/                   # Componentes shadcn
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── Caddyfile
├── .env.production               # Template de variables (copiar a .env en server)
└── docs/
    ├── DEPLOY.md
    └── ...
```

---

## 🌐 Dominio

| Dato | Valor |
|------|-------|
| **Dominio** | `nuncacierro.com` |
| **Registrar** | Cloudflare |
| **Registrado** | 3 Jun 2026 |
| **Expira** | 3 Jun 2027 (auto-renew) |

### Subdominios

| Dominio | Sirve |
|---------|-------|
| `nuncacierro.com` | Dashboard + Landing (Next.js) |
| `api.nuncacierro.com` | API REST (FastAPI) |

### Registros DNS en Cloudflare

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| A | `@` | `62.238.47.178` | ☑️ Naranja |
| AAAA | `@` | `2a01:4f9:c015:ca26::64` | ☑️ Naranja |
| A | `api` | `62.238.47.178` | ☑️ Naranja |
| AAAA | `api` | `2a01:4f9:c015:ca26::64` | ☑️ Naranja |

---

## 🖥️ Servidor (Hetzner)

| Dato | Valor |
|------|-------|
| **Provider** | Hetzner Cloud |
| **Plan** | CPX22 |
| **CPU** | 2 vCPU |
| **RAM** | 4 GB |
| **Disco** | 40 GB SSD |
| **OS** | Ubuntu 24.04 LTS |
| **Ubicación** | Helsinki (HEL) |
| **IPv4** | `62.238.47.178` |
| **IPv6** | `2a01:4f9:c015:ca26::64` |

### Firewall (`nuncacierro-fw`)

| Direction | Protocol | Port | Source |
|-----------|----------|------|--------|
| In | ICMP | — | `0.0.0.0/0` |
| In | TCP | 22 | `0.0.0.0/0` |
| In | TCP | 80 | `0.0.0.0/0` |
| In | TCP | 443 | `0.0.0.0/0` |
| Out | TCP/UDP | Any | `0.0.0.0/0` |

---

## 🔐 SSH

```powershell
ssh ubuntu@62.238.47.178
```

---

## 🐳 Docker

### Servicios

| Servicio | Puerto interno | Expuesto | Imagen |
|----------|---------------|----------|--------|
| `postgres` | 5432 | `127.0.0.1:5432` | `postgres:16-alpine` |
| `nc-api` | 8000 | `127.0.0.1:8000` | `./nc-api/Dockerfile` |
| `nc-dashboard` | 3000 | `127.0.0.1:3000` | `./nc-dashboard/Dockerfile` |
| `caddy` | 80, 443 | `80, 443` | `caddy:2-alpine` |
| `evolution-api` | 8080 | — | `evoapicloud/evolution-api:latest` |
| `redis` | 6379 | — | `redis:7-alpine` |
| `postgres-evo` | 5432 | — | `postgres:16-alpine` |

> `nc-api` expone `GET /health` (liveness) y `GET /ready` (readiness con DB).
> El compose usa `/ready` como healthcheck del contenedor (`service_healthy`),
> y `nc-dashboard` espera a que `nc-api` esté healthy antes de arrancar.

### Comandos

```bash
# Deploy completo con SSL (producción)
docker compose --profile caddy up -d --build

# Deploy LOCAL (sin Caddy ni SSL)
docker compose up -d --build

# Rebuild solo los contenedores propios
docker compose build nc-api nc-dashboard
docker compose up -d

# Logs
docker compose logs -f
docker compose logs nc-api --tail=50

# Estado
docker compose ps

# Reiniciar un servicio
docker compose restart nc-api
docker compose restart caddy
```

---

## ⚙️ Variables de entorno requeridas

Copiar `.env.production` a `.env` en el servidor y llenar con valores reales.

| Variable | Descripción | Generar con | Default |
|----------|-------------|-------------|---------|
| `POSTGRES_USER` | Usuario PostgreSQL | — | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña maestra PostgreSQL | `openssl rand -base64 24` | — |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `openssl rand -base64 48` | — |
| `ENCRYPTION_KEY` | Clave Fernet (cifrado credenciales) | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` | — |
| `GROQ_API_KEY` | API key de Groq | Dashboard de Groq | — |
| `GROQ_MODEL` | Modelo de IA | — | `openai/gpt-oss-120b` |
| `ADMIN_DEFAULT_PASSWORD` | Contraseña admin inicial | Elegir una segura | `nuncacierro2026*` |
| `LOG_LEVEL` | Nivel de logs | — | `info` |
| `EVO_API_KEY` | API key Evolution API | `openssl rand -base64 32` | — |
| `EVO_DB_PASSWORD` | Contraseña DB Evolution | `openssl rand -base64 24` | — |
| `CORS_ORIGINS` | Orígenes permitidos | `'["*"]'` | `["*"]` |
| `CADDY_DOMAIN` | Dominio para SSL | — | — |

### Configuración Backend (nc-api)

Las siguientes variables de entorno son consumidas por FastAPI vía `app/core/config.py`:

| Variable | Default | Notas |
|----------|---------|-------|
| `APP_HOST` | `0.0.0.0` | — |
| `APP_PORT` | `8000` | — |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Se construye en docker-compose |
| `GROQ_MAX_TOKENS` | `512` | Tokens máx por respuesta |
| `GROQ_TEMPERATURE` | `0.7` | Creatividad de la IA |
| `RATE_LIMIT_MAX_REQUESTS` | `10` | Límite de rate limiting |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Ventana del rate limiter |
| `ANTI_SPAM_ENABLED` | `true` | Sistema anti-spam |
| `EVO_API_BASE_URL` | `http://evolution-api:8080` | URL interna de Evolution |
| `WEBHOOK_PUBLIC_BASE_URL` | `https://api.nuncacierro.com` | URL pública base de nc-api para callbacks de webhooks (Telegram, Evolution) |
| `EVO_INTERNAL_BASE_URL` | `http://nc-api:8000` | URL interna de Docker para Evolution → nc-api (webhook) |

### Configuración Dashboard (nc-dashboard)

| Variable | Default | Notas |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | `http://nc-api:8000` | URL de la API (build arg en Docker) |

---

## 🔄 Pipeline de deploy

### Manual

```bash
# En el servidor
cd ~/nunca-cierro
git pull
docker compose --profile caddy up -d --build
```

### Auto-deploy (GitHub Action)

Cada push a `main` ejecuta automáticamente:

1. `git pull` en el servidor
2. `docker compose build nc-api nc-dashboard`
3. `docker compose --profile caddy up -d`
4. `docker system prune -f`

Secret requerido en GitHub: `SSH_PRIVATE_KEY`.

---

## 🗄️ Migraciones de base de datos

> El entrypoint de nc-api ejecuta `alembic upgrade head` automáticamente al iniciar.

```bash
# Ver estado actual
docker compose exec nc-api uv run alembic current

# PREFLIGHT: detecta duplicados de mensajes ANTES de migrar (no borra nada;
# exit 0 = seguro, exit 1 = resolvé los grupos primero)
docker compose exec nc-api uv run python -m scripts.preflight_messages_dedup

# Aplicar migraciones pendientes
docker compose exec nc-api uv run alembic upgrade head

# Crear nueva migración (si se modifica un modelo)
docker compose exec nc-api uv run alembic revision --autogenerate -m "descripcion"
```

> La migración `a1b2c3d4e5f6` (constraint de dedup en `messages`) **aborta**
> si hay grupos duplicados de `(platform_connection_id, external_message_id)`
> — nunca borra datos. Corré el preflight de arriba y resolvé los grupos
> manualmente (ver `nc-api/EVOLUTION.md` → "Runbook — duplicados").

### Migraciones aplicadas

| ID | Descripción |
|----|-------------|
| `8d353aecd482` | Payment status + plan_activated_at en tenants |
| `a1b2c3d4e5f6` | Constraint única dedup `(platform_connection_id, external_message_id)` en messages |
| `b1c2d3e4f5a6` | Agentes: modelos Groq deprecados → `openai/gpt-oss-120b` (solo valores exactos; custom intactos) |

---

## 🧬 Evolution API

- **No expuesto al exterior.** Solo accesible vía red interna de Docker.
- nc-api → Evolution: `http://evolution-api:8080`
- Evolution → nc-api webhook: `{EVO_INTERNAL_BASE_URL}/webhook/evolution/{id}` (default `http://nc-api:8000` en Docker; configurable)
- El webhook se registra con header `apikey` (validación fail-closed en nc-api). Al migrar desde un deploy viejo, corré el backfill: `docker compose exec nc-api uv run python -m scripts.backfill_evolution_webhooks --apply` (ver runbook en `nc-api/EVOLUTION.md`).
- Requiere PostgreSQL extra + Redis para cache
- Documentación: https://docs.evolutionfoundation.com.br

---

## 📊 Sistema de planes y trial

| Plan | IA | Productos | Conversaciones/mes | Negocios |
|------|-----|-----------|-------------------|----------|
| **Trial** (7 días) | ❌ Programadas | — | — | 1 |
| **Básico** | ❌ Programadas | Hasta 10 | 500 | 1 |
| **Profesional** | ✅ Groq | Hasta 50 | 5.000 | 3 |
| **Empresarial** | ✅ Groq | Ilimitado | Ilimitadas | Ilimitados |

- El trial se desactiva automáticamente al día 8 (`tenant.status = "inactive"`).
- Los planes Básico y Trial usan respuestas programadas por keywords.
- Los planes con IA usan Groq (`openai/gpt-oss-120b` por default).
- Sin cambios en DB — usa `tenant.plan` + `tenant.created_at` para el trial.

---

## 👥 Roles de usuario

| Rol | Acceso |
|-----|--------|
| **superadmin** | Todo |
| **admin** | Gestión de negocios, agentes, conexiones |
| **client** | Dashboard según plan del tenant |

### Acceso de clientes por plan

| Plan | ¿Ve dashboard? | ¿Cambia contraseña? |
|------|----------------|---------------------|
| Básico | ✅ (base, solo lectura) | ✅ |
| Trial | ✅ (info básica) | ✅ |
| Profesional | ✅ | ✅ |
| Empresarial | ✅ | ✅ |

---

## 📝 Rutas principales

### Landing (pública)
| Ruta | Contenido |
|------|-----------|
| `/` | Landing completa |
| `/legal` | Privacidad, términos, datos |

### Dashboard (auth required)
| Ruta | Contenido |
|------|-----------|
| `/dashboard` | Panel principal |
| `/dashboard/tenants` | CRUD de negocios |
| `/dashboard/agents` | CRUD de agentes IA |
| `/dashboard/platforms` | Conexiones (WhatsApp, Telegram) |
| `/dashboard/conversations` | Conversaciones |
| `/dashboard/admin/users` | Gestión de usuarios |

### API (auth required)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/register` | Registro |
| `GET` | `/api/v1/auth/me` | Perfil (incluye plan) |
| `POST` | `/api/v1/auth/change-password` | Cambiar contraseña |
| `CRUD` | `/api/v1/tenants` | Negocios |
| `CRUD` | `/api/v1/agents` | Agentes IA |
| `CRUD` | `/api/v1/platform-connections` | Conexiones |
| `GET` | `/api/v1/conversations` | Conversaciones |
| `POST` | `/webhook/evolution/{id}` | Webhook WhatsApp |

---

## 💾 Backup de base de datos

Automatizado vía cron: cada domingo 3 AM.

```bash
# Backup manual
/home/ubuntu/nunca-cierro/backup-db.sh

# Listar backups
ls -la /backups/postgres/

# Restaurar
gunzip -c /backups/postgres/nuncacierro-YYYY-MM-DD.sql.gz | \
  docker exec -i nuncacierro-postgres-1 psql -U postgres nuncacierro
```

Los backups se guardan comprimidos y se rotan automáticamente (30 días).

---

## 📊 Monitoreo

- **Tráfico**: Cloudflare Analytics
- **Uptime**: UptimeRobot (gratis)
- **Costo**: Panel Hetzner → Billing
- **Logs**: `docker compose logs`
