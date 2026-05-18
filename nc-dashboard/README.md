# NuncaCierro — Panel de Administración

Dashboard web para gestionar la automatización WhatsApp de **NuncaCierro**.  
Administra negocios, agentes de IA, números WhatsApp y conversaciones — todo desde un solo panel.

**Stack:** Next.js 16 · React 19 · TypeScript · shadcn/ui · Tailwind CSS v4

---

## ✨ Funcionalidades

### 🌐 Landing Page
Página web profesional del producto con secciones informativas:
- **Hero** — propuesta de valor y CTA a WhatsApp
- **Servicios** — bot WhatsApp, asistente inteligente, sistema completo
- **Proceso** — cómo funciona en 3 pasos
- **Planes** — Básico / Profesional / Empresarial
- **Ejemplos** — demos interactivos por industria (restaurante, spa, gym, barbería, belleza, dental)
- **FAQ** — preguntas frecuentes
- **Contacto** — formulario y enlaces directos

### 🔐 Auth
- Registro e inicio de sesión con JWT
- Protección de rutas del dashboard
- Sesión persistente con contexto React

### 📊 Dashboard
- **Métricas en vivo**: total negocios, leads, mensajes hoy, uso de API
- **Negocios recientes**: cards con estado y plan
- **Últimas conversaciones**: resumen con conteo de mensajes

### 🏢 Negocios (Tenants)
- CRUD completo de negocios
- Planes: Basic / Pro / Enterprise
- Zona horaria e idioma por negocio
- Slug auto-generado desde el nombre

### 🤖 Agentes de IA
- CRUD completo de agentes por negocio
- Múltiples proveedores: **Groq** (gratis), OpenAI, Anthropic
- Modelos configurables (temperatura, max tokens)
- **System prompts versionados** — cada guardado crea una nueva versión, historial completo

### 📱 Números WhatsApp
- Registro de números reales de Meta
- Campos: Phone Number ID, WABA ID, estado
- Vinculación directa al negocio (tenant)

### 💬 Conversaciones
- Listado de conversaciones activas
- Vista de chat con historial de mensajes
- Detección automática del negocio por `phone_number_id`

---

## 🚀 Quick Start

### Prerrequisitos

- **Node.js 20+**
- **npm** (viene con Node)
- **nc-api** corriendo localmente (ver [nc-api README](../nc-api/README.md))

### Instalación

```bash
# Clonar (si no lo tienes)
git clone https://github.com/beto18v/nunca-cierro.git
cd nunca-cierro/nc-dashboard

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
# URL del backend nc-api (producción)
NEXT_PUBLIC_API_URL=https://nunca-cierro.up.railway.app

# URL del backend nc-api (desarrollo local — sobreescribe la anterior)
NEXT_PUBLIC_API_URL_LOCAL=http://localhost:8000
```

### Desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Tests

```bash
npm test          # Vitest
```

### Producción

```bash
npm run build
npm start
```

---

## 🏗️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19 + shadcn/ui (Radix UI) |
| **Estilos** | Tailwind CSS v4 + tw-animate-css |
| **Formularios** | React Hook Form + Zod |
| **Animaciones** | Framer Motion / Motion |
| **Iconos** | lucide-react + react-icons |
| **Notificaciones** | sonner |
| **Tema** | next-themes (claro/oscuro) |
| **Analytics** | @vercel/analytics |
| **Tests** | Vitest + @testing-library/react |

---

## 🔗 Arquitectura

```
                         ┌─────────────────┐
                         │  nc-dashboard    │
                         │  (Next.js 16)    │
                         │  localhost:3000  │
                         └────────┬────────┘
                                  │
                           (API REST)
                                  │
                         ┌────────▼────────┐
                         │    nc-api        │
                         │  (FastAPI +      │
                         │   PostgreSQL)    │
                         │  localhost:8000  │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼─────┐ ┌────▼────┐ ┌──────▼─────┐
              │ WhatsApp   │ │  Groq   │ │   Auth     │
              │ Cloud API  │ │  AI     │ │   (JWT)    │
              └───────────┘ └─────────┘ └────────────┘
```

**Dos repositorios, un solo proyecto:**

| Proyecto | Rol | Puerto |
|----------|-----|--------|
| `nc-api` | Backend FastAPI + PostgreSQL | `:8000` |
| `nc-dashboard` | Frontend Next.js | `:3000` |

---

## 🗂️ Estructura del Proyecto

```
nc-dashboard/
├── app/                    # Next.js App Router
│   ├── auth/               # Login + Register
│   ├── dashboard/          # Panel protegido
│   │   ├── agents/         # Agentes de IA
│   │   ├── conversations/  # Conversaciones
│   │   ├── tenants/        # Negocios
│   │   └── whatsapp/       # Números WhatsApp
│   ├── layout.tsx          # Layout global
│   └── page.tsx            # Landing page
├── components/
│   ├── layout/             # Header, Footer, Sidebar, etc.
│   ├── sections/           # Secciones de landing (hero, services, etc.)
│   └── ui/                 # shadcn/ui components
├── data/
│   └── site.ts             # Contenido estático (marcas, planes, FAQ, etc.)
├── docs/                   # Documentación interna
│   ├── app-guide.md        # Guía completa de uso
│   ├── backend-info.md     # Referencia de endpoints de nc-api
│   └── rbac-route-matrix.md # Matriz de rutas y permisos
├── hooks/                  # React hooks + clients API
├── lib/                    # Utilidades, tipos, esquemas, config
├── tests/                  # Tests (Vitest)
└── public/                 # Assets estáticos
```

---

## 📁 Documentación Relacionada

| Documento | Contenido |
|-----------|-----------|
| [`docs/app-guide.md`](./docs/app-guide.md) | Guía completa del flujo de la aplicación |
| [`docs/backend-info.md`](./docs/backend-info.md) | Referencia de todos los endpoints de nc-api |
| [`docs/rbac-route-matrix.md`](./docs/rbac-route-matrix.md) | Matriz de rutas y permisos por rol |

---

## 📄 Estado del Proyecto

**Fase:** MVP funcional — desarrollo activo.

### ✅ Implementado
- Landing page completa con todas las secciones
- Auth (registro / login con JWT)
- Dashboard con métricas en vivo
- CRUD de negocios (tenants)
- CRUD de agentes de IA con versionado de prompts
- CRUD de números WhatsApp
- Visualización de conversaciones
- Tema claro/oscuro
- Tests unitarios con Vitest
- Deploy en Vercel

### 🔜 Próximos pasos
- Filtros avanzados en conversaciones
- Notificaciones en tiempo real (WebSockets)
- Roles y permisos multi-usuario
- Exportación de reportes
- Onboarding guiado para nuevos negocios

---

## 📄 Licencia

**MIT** — NuncaCierro © 2026
