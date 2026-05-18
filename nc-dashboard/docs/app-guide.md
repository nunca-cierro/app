# NuncaCierro — Guía Completa de la Aplicación

> Panel de administración para automatización WhatsApp con IA.
> Este documento explica cómo funciona todo: desde el registro hasta la configuración de números reales en Meta.

---

## Arquitectura Rápida

```
Usuario (cliente WhatsApp)
       │
       ▼
Meta WhatsApp Cloud API ──► nc-api (FastAPI/PostgreSQL) ──► nc-dashboard (Next.js)
       │                                                            │
       │                                                    Admin del negocio
       │                                                    (tú o tu cliente)
       ▼
  Bot responde (Groq AI)
```

**Dos repositorios, un solo proyecto:**

| Proyecto | Rol | Puerto |
|----------|-----|--------|
| `nc-api` | Backend FastAPI + PostgreSQL | `:8000` |
| `nc-dashboard` | Frontend Next.js | `:3000` |

---

## Flujo Completo (Orden Obligatorio)

Cada paso depende del anterior. No puedes saltarte ninguno.

```
 1. Auth ──────────────────► 2. Tenants ────────────────► 3. Agentes
   Crear tu cuenta            Crear un negocio             Configurar el bot
   (admin)                    (Restaurante La 10)           + system prompt
                                   │
                                   ▼
                           4. WhatsApp Numbers
                             Registrar número real
                             de Meta
                                   │
                                   ▼
                           5. Conversaciones
                             Mensajes reales entran solos
                             por el webhook
```

---

## 1. Auth — Crear tu cuenta

**Ruta:** `/auth/register`

```
Formulario:
├── Nombre: Tu nombre
├── Email: admin@tudominio.com
└── Contraseña: mínimo 6 caracteres
       │
       ▼
POST /api/v1/auth/register
       │
       ▼
Te redirige al dashboard automáticamente
```

**Backend crea:** `users` (tabla PostgreSQL)

---

## 2. Tenants — Crear un negocio

**Ruta:** `/dashboard/tenants/new`

Cada "tenant" es un negocio cliente que usa tu plataforma.

```
Formulario:
├── Nombre: Restaurante La 10
├── Plan: Basic / Pro / Enterprise
├── Zona horaria: America/Bogota
└── Idioma: Español (Colombia)
       │
       ▼
POST /api/v1/tenants
       │
       ▼
Backend crea tenant + slug auto-generado "restaurante-la-10"
```

**Backend crea:** `tenants` (tabla PostgreSQL)

**¿Por qué es primero?** Porque Agentes, WhatsApp Numbers y Conversaciones dependen de un `tenant_id`.

---

## 3. Agentes — Configurar el bot

**Ruta:** `/dashboard/agents/new`

Cada negocio puede tener uno o más agentes de IA.

```
Formulario:
├── Negocio: Seleccionas el tenant creado antes
├── Nombre: Atención al Cliente
├── Proveedor: Groq (gratis) / OpenAI / Anthropic
├── Modelo: llama-3.3-70b-versatile
├── Temperatura: 0.7 (0 = preciso, 2 = creativo)
└── Max tokens: 512
       │
       ▼
POST /api/v1/agents
```

**Backend crea:** `ai_agents` (tabla PostgreSQL, FK → `tenants.id`)

### System Prompt — La personalidad del bot

**Ruta:** `/dashboard/agents/{id}` → Tab "System Prompt"

Aquí escribes cómo debe comportarse el bot:

```
"Eres un asistente de restaurante colombiano.
Responde siempre con amabilidad y en español.
Si te preguntan por el menú, di que tenemos bandeja
paisa, ajiaco y sancocho. Horario: lun-sáb 8am-10pm."
       │
       ▼
POST /api/v1/agents/{id}/prompts
       │
       ▼
Backend guarda versión v1 (auto-incrementada)
```

**Cada vez que guardas, se crea una nueva versión.** Puedes ver el historial en la misma pantalla. No se pierde nada.

**Backend crea:** `prompts` (tabla PostgreSQL, FK → `ai_agents.id`)

---

## 4. WhatsApp Numbers — Conectar número real

**Ruta:** `/dashboard/whatsapp/new`

### Debes tener:

1. Una **WABA (WhatsApp Business Account)** — se crea desde Meta Business Suite
2. Un **número telefónico** registrado en esa WABA

### Campos del formulario:

| Campo | Qué es | Dónde lo consigues |
|-------|--------|--------------------|
| **Negocio** | El tenant al que pertenece | Ya lo creaste en el paso 2 |
| **Número WhatsApp** | El número real | El que registraste en Meta |
| **Phone Number ID** | ID único del número | Meta Business Suite → WhatsApp → Números |
| **WABA ID** | ID de tu cuenta WhatsApp Business | Meta Business Suite → WhatsApp → Cuenta |
| **Estado** | Activo / Inactivo | Lo controlas tú |

```
POST /api/v1/whatsapp-numbers
       │
       ▼
Backend crea WhatsAppNumber (FK → tenants.id)
```

### Cómo obtener los IDs de Meta Paso a Paso

**Paso 1:** Ve a [business.facebook.com](https://business.facebook.com)

**Paso 2:** Entra a tu **Business Manager**

**Paso 3:** En el menú izquierdo, baja a **Cuentas de WhatsApp**

```
Business Manager
└── Configuración
      └── Cuentas de WhatsApp
            └── Tu WABA (ej: "Mi Empresa")
                  ├── WABA ID: 123456789     ← ESTO
                  ├── Número: +573001234567
                  │     └── Phone Number ID: 345678901  ← ESTO
                  └── Número: +573009876543
                        └── Phone Number ID: 678901234
```

### Requisitos del número

- ❌ **No** puede ser un número que ya tenga WhatsApp Business activo
- ✅ Debe ser un número que **nunca** se haya usado en WhatsApp Business, O que esté **liberado**
- ✅ Recibirás un SMS o llamada para verificarlo
- ✅ En Colombia, Claro, Tigo y Movistar funcionan

**El Phone Number ID y WABA ID** son los que registras en el frontend. Sin ellos, el webhook no sabe a qué número llegó el mensaje.

---

## 5. Conversaciones — Mensajes en vivo

**Ruta:** `/dashboard/conversations`

### Cómo llegan los mensajes

```
Cliente escribe a tu número WhatsApp
       │
       ▼
Meta envía POST al webhook:
POST /webhook (en nc-api)
       │
       ▼
Backend:
1. Identifica el tenant por phone_number_id
2. Busca o crea la conversación
3. Guarda el mensaje
4. Responde con el bot (si hay agente configurado)
       │
       ▼
Dashboard (polling cada vez que entras):
GET /api/v1/conversations → lista
GET /api/v1/conversations/{id}/messages → historial tipo chat
```

### Lo que ves en el frontend

```
Conversación con: +573001234567
─────────────────────────────────
  Cliente: Hola, ¿cuánto vale la bandeja paisa?     ← Burbuja gris (in)
     Bot: La bandeja paisa cuesta $28,000 COP        ← Burbuja azul (out)
  Cliente: Voy más tarde entonces                     ← Burbuja gris (in)
     Bot: ¡Te esperamos!                              ← Burbuja azul (out)
```

---

## Rutas Completas

### Frontend (`nc-dashboard`)

| Ruta | Qué hace | Steps requeridos |
|------|----------|------------------|
| `/auth/login` | Iniciar sesión | — |
| `/auth/register` | Crear cuenta | — |
| `/dashboard` | Resumen con métricas | Auth |
| `/dashboard/tenants` | Listar negocios | Auth |
| `/dashboard/tenants/new` | Crear negocio | Auth |
| `/dashboard/tenants/{id}` | Detalle/editar negocio | Auth + Tenant |
| `/dashboard/agents` | Listar agentes | Auth |
| `/dashboard/agents/new` | Crear agente | Auth + Tenant |
| `/dashboard/agents/{id}` | Detalle/editar/prompt | Auth + Agent |
| `/dashboard/whatsapp` | Listar números | Auth |
| `/dashboard/whatsapp/new` | Registrar número | Auth + Tenant |
| `/dashboard/whatsapp/{id}` | Detalle/editar número | Auth + WhatsAppNum |
| `/dashboard/conversations` | Listar conversaciones | Auth |
| `/dashboard/conversations/{id}` | Ver chat de mensajes | Auth + Conv |

### Backend (`nc-api`)

| Método | Ruta | Auth |
|--------|------|------|
| `POST` | `/api/v1/auth/register` | ❌ |
| `POST` | `/api/v1/auth/login` | ❌ |
| `GET` | `/api/v1/auth/me` | ✅ |
| `GET` | `/api/v1/tenants` | ✅ |
| `POST` | `/api/v1/tenants` | ✅ |
| `GET` | `/api/v1/tenants/{id}` | ✅ |
| `PATCH` | `/api/v1/tenants/{id}` | ✅ |
| `DELETE` | `/api/v1/tenants/{id}` | ✅ |
| `GET` | `/api/v1/agents` | ✅ |
| `POST` | `/api/v1/agents` | ✅ |
| `GET` | `/api/v1/agents/{id}` | ✅ |
| `PATCH` | `/api/v1/agents/{id}` | ✅ |
| `DELETE` | `/api/v1/agents/{id}` | ✅ |
| `GET` | `/api/v1/agents/{id}/prompts` | ✅ |
| `POST` | `/api/v1/agents/{id}/prompts` | ✅ |
| `GET` | `/api/v1/whatsapp-numbers` | ✅ |
| `POST` | `/api/v1/whatsapp-numbers` | ✅ |
| `GET` | `/api/v1/whatsapp-numbers/{id}` | ✅ |
| `PATCH` | `/api/v1/whatsapp-numbers/{id}` | ✅ |
| `DELETE` | `/api/v1/whatsapp-numbers/{id}` | ✅ |
| `GET` | `/api/v1/conversations` | ✅ |
| `GET` | `/api/v1/conversations/{id}` | ✅ |
| `GET` | `/api/v1/conversations/{id}/messages` | ✅ |
| `GET` | `/api/v1/metrics/dashboard` | ✅ |
| `GET` | `/webhook` | ❌ (verificación Meta) |
| `POST` | `/webhook` | ❌ (mensajes entrantes) |

---

## Checklist para empezar a usar

- [ ] **1.** Registrarme en `/auth/register`
- [ ] **2.** Crear un negocio en `/dashboard/tenants/new`
- [ ] **3.** Crear un agente en `/dashboard/agents/new`
- [ ] **4.** Escribir el system prompt en `/dashboard/agents/{id}`
- [ ] **5.** Ir a [business.facebook.com](https://business.facebook.com) y obtener:
  - [ ] WABA ID
  - [ ] Phone Number ID del número registrado
- [ ] **6.** Registrar el número en `/dashboard/whatsapp/new`
- [ ] **7.** Configurar el webhook en Meta para que apunte a `nc-api/webhook`
- [ ] **8.** ¡Los mensajes empiezan a llegar a `/dashboard/conversations`!

---

## Notas importantes

- **El slug del negocio se genera solo** desde el nombre. "Mi Restaurante" → "mi-restaurante"
- **Los prompts se versionan automáticamente.** Cada guardado = versión nueva. Nunca pierdes una versión anterior.
- **Las conversaciones se almacenan completas** en PostgreSQL. Para un negocio promedio, 1000 mensajes/día ≈ 200KB. 1 año de datos ≈ 70MB. Perfectamente manejable.
- **El webhook responde 200 siempre** (incluso si hay error interno). Esto evita que Meta reintente mensajes fallidos.
- **Si el bot falla, el mensaje se guarda igual.** No se pierde información.
