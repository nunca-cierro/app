# NuncaCierro — Panel de Administración

Dashboard web para gestionar la automatización WhatsApp de **NuncaCierro**.  
Administra negocios, agentes de IA, números WhatsApp y conversaciones — todo desde un solo panel.

**Stack:** Next.js 16 · React 19 · TypeScript · shadcn/ui · Tailwind CSS v4

---

## ✨ Funcionalidades

### 🔐 Multi-tenant Auth
- Registro e inicio de sesión con JWT.
- Cada usuario puede crear y administrar múltiples **Tenants** (Negocios).
- Aislamiento total de datos entre tenants.

### 🧙 Dashboard Wizard Flow
Flujo guiado para poner en marcha un negocio en minutos:
1. **Crear Tenant**: Definir nombre, zona horaria y plan.
2. **Configurar Agente**: Personalizar el cerebro de la IA (instrucciones, FAQ, catálogo).
3. **Vincular Plataforma**: Conectar WhatsApp (vía Evolution API) o Telegram.
4. **Validación Automática**: El sistema registra los webhooks y valida las conexiones en tiempo real.

### 🤖 Agentes de IA Inteligentes
- CRUD completo de agentes por negocio.
- Motor: **Groq** con modelos LLaMA 3.3 70B Versatile.
- **System prompts versionados**: Historial completo de cambios en la configuración del agente.
- **Business Config**: Estructura de datos completa para que la IA conozca el negocio (horarios, servicios, tono).

### 🔗 Conexiones de Plataforma
- **Evolution API v2.x**: Gateway preferido para WhatsApp (multi-número, sin verificación Meta).
- **Telegram**: Integración nativa con bots.
- **Cifrado**: Las credenciales se envían y almacenan cifradas en el backend.

### 📊 Gestión de Conversaciones
- Listado de conversaciones activas multi-tenant.
- Vista de chat con historial completo de mensajes y estado de entrega.
- Identificación automática de plataforma y número de origen.

---

## 🚀 Quick Start

### Prerrequisitos

- **Node.js 22+**
- **npm** o **pnpm**
- **nc-api** corriendo (ver [nc-api README](../nc-api/README.md))

### Configuración

Edita `.env.local`:

```env
# URL del backend nc-api
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Desarrollo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19 + shadcn/ui |
| **Estilos** | Tailwind CSS v4 |
| **Formularios** | React Hook Form + Zod |
| **Animaciones** | Framer Motion |
| **Notificaciones** | sonner |
| **Icons** | Lucide React |

---

## 📁 Documentación Interna

| Documento | Contenido |
|-----------|-----------|
| [`docs/app-guide.md`](./docs/app-guide.md) | Guía de uso y flujos de usuario |
| [`docs/backend-info.md`](./docs/backend-info.md) | Referencia de la API REST |
| [`docs/rbac-route-matrix.md`](./docs/rbac-route-matrix.md) | Rutas y permisos |

---

## 📄 Licencia

**MIT** — NuncaCierro © 2026
