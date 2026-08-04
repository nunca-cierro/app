# 📋 NuncaCierro — Documento del Negocio

> Documento interno. No subir al repositorio público.
> Última actualización: junio 2026.

---

## 🎯 Visión

Automatizar la atención al cliente vía WhatsApp para negocios en Colombia. Que cualquier negocio — sin importar su tamaño — pueda responder consultas, agendar citas y vender productos 24/7 sin estar pegado al celular.

---

## 💰 Planes y Precios

| Plan | Precio (COP/mes) | Tipo de respuestas | Productos | Conversaciones/mes | Negocios |
|------|-----------------|-------------------|-----------|-------------------|----------|
| **Trial** (7 días) | Gratis | Programadas (FAQ) | — | — | 1 |
| **Básico** | $60.000 | Programadas (FAQ) | Hasta 10 | 500 | 1 |
| **Profesional** ⭐ | $120.000 | IA (Groq) | Hasta 50 | 5.000 | 3 |
| **Empresarial** | $250.000 | IA (Groq) | Ilimitado | Ilimitadas | Ilimitados |

> ⭐ = Plan más elegido (badge en landing)

### Features por plan

| Feature | Básico | Profesional | Empresarial |
|---------|--------|-------------|-------------|
| Respuestas | FAQ + keywords | IA (Groq) | IA (Groq) |
| Métricas semanales | ✅ | ✅ | ✅ |
| Dashboard en vivo | ❌ | ✅ | ✅ |
| Soporte | WhatsApp | WhatsApp | Prioritario 24/7 |

### Trial

- 7 días gratis con respuestas programadas (FAQ)
- Sin tarjeta de crédito
- Al día 8 se desactiva automáticamente (`tenant.status = "inactive"`)
- El admin puede activar un plan pago desde el dashboard

### Precios de IA (Groq)

- Modelo: **OpenAI GPT-OSS 120B** (`openai/gpt-oss-120b`)
- Costo: $0.15/1M input tokens, $0.60/1M output tokens
- Estimado por consulta: ~$0.0002 USD (~$1 COP, recalcular con uso real)
- 5.000 consultas/mes ~ $1 USD ~ $4.000 COP (estimado)
- El costo de IA es casi insignificante con Groq

---

## 👥 Roles de Usuario

| Rol | Acceso |
|-----|--------|
| **superadmin** | Todo: negocios, agentes, usuarios, conexiones, conversaciones |
| **admin** | Negocios, agentes, conexiones |
| **client** | Limitado por plan del tenant |

### Acceso de clientes por plan

| Plan | ¿Ve dashboard? | ¿Cambia contraseña? | ¿Ve métricas? |
|------|----------------|---------------------|---------------|
| Básico | ❌ | ❌ | ❌ |
| Trial | ✅ (solo info) | ❌ | ❌ |
| Profesional | ✅ | ✅ | ✅ |
| Empresarial | ✅ | ✅ | ✅ |

---

## 🧠 Cómo funciona la IA

### Flujo de mensajes

```
Cliente → WhatsApp → Evolution API → nc-api
  ├─ Plan basic/trial → FAQ keyword matching
  │   ├─ ≥2 palabras coinciden con pregunta FAQ → envía respuesta FAQ
  │   ├─ Coincide con keyword de escalación → "Un asesor te contactará"
  │   └─ Sin coincidencia → mensaje default
  └─ Plan professional/enterprise → Groq IA
      ├─ Carga business_config (instrucciones + info + productos + FAQ)
      ├─ Carga historial de conversación (últimos 6 mensajes)
      ├─ Genera respuesta con IA
      └─ Envía vía Evolution API
```

### FAQ Keyword Matching (planes Basic/Trial)

El matcheo funciona así:
1. Se toma el mensaje del cliente y se divide en palabras
2. Se compara con cada pregunta del FAQ configurado en el agente
3. Si **2 o más palabras** coinciden entre el mensaje y la pregunta → se envía la respuesta del FAQ
4. Si el mensaje contiene alguna **palabra clave de derivación** → se envía mensaje de escalación a humano
5. Si no hay coincidencia → mensaje default genérico

**Ejemplo:**
- FAQ: "¿Cuál es el horario?" → "Lunes a viernes 8am a 6pm"
- Cliente: "¿a qué hora abren hoy?"
- Palabras compartidas: "hora" (de "horario" → no exacta), "hoy" (no en FAQ)
- Resultado: 0 coincidencias → mensaje default

**Limitación actual:** solo se compara con las preguntas del FAQ. No se usan los productos, horarios ni otra info del business_config para el matcheo en planes sin IA. Esto es intencional — si el negocio necesita respuestas más inteligentes, debe usar un plan con IA.

### Plantillas de agente

Cada plantilla incluye:
- **Instrucciones**: cómo debe comportarse el bot
- **Datos del negocio**: nombre, horarios, ubicación, teléfono
- **Productos/Servicios**: lista con nombre y precio
- **FAQ**: preguntas frecuentes con respuestas
- **Tono**: amigable, formal, casual, ejecutivo
- **Keywords de derivación**: palabras que escalan a humano
- **Mensaje fallback**: qué decir cuando no puede responder

Plantillas disponibles:
1. 🍕 Restaurante — menú, reservas, domicilios
2. 🥖 Panadería — productos artesanales, pedidos por encargo
3. 🍔 Hamburguesería — combos, ingredientes, personalización
4. 💈 Barbería — turnos, servicios, precios
5. 🏥 Clínica / Consultorio — citas, especialidades, EPS
6. 🏢 NuncaCierro — template comercial para ventas del servicio

---

## 🏗️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + Python 3.12 + uv |
| Frontend | Next.js 16 + Tailwind CSS v4 + Framer Motion |
| DB | PostgreSQL 16 + SQLAlchemy Async |
| IA | Groq API — OpenAI GPT-OSS 120B (default) |
| WhatsApp | Evolution API v2.x |
| Proxy/SSL | Caddy (Let's Encrypt) |
| Cache | Redis 7 |
| Infra | Docker Compose en Hetzner CPX22 |

---

## 🔌 Integraciones

### Evolution API (WhatsApp)
- Instancia por cliente/negocio
- Webhook → nc-api: `POST /webhook/evolution/{connection_id}`
- nc-api → Evolution: envía respuestas vía REST
- No expuesto al exterior (solo red Docker interna)

### Groq (IA)
- Modelo: `openai/gpt-oss-120b`
- Temperatura por defecto: 0 (respuestas precisas, no creativas)
- Max tokens: 512 (Profesional) / 1024 (Empresarial)
- Rate limiting: 30 RPM

---

## 📊 Dashboard

### Páginas principales

| Ruta | Función |
|------|---------|
| `/dashboard` | Panel principal con métricas |
| `/dashboard/tenants` | CRUD de negocios |
| `/dashboard/tenants/[id]` | Detalle + editar plan |
| `/dashboard/agents` | Lista de agentes IA |
| `/dashboard/agents/[id]` | Info del agente + Negocio + Editar |
| `/dashboard/agents/new` | Crear agente desde plantilla |
| `/dashboard/conversations` | Historial de conversaciones |
| `/dashboard/platforms` | Conexiones WhatsApp/Telegram |
| `/dashboard/admin/users` | Gestión de usuarios (superadmin) |

---

## 💳 Métodos de Pago

- **Actual**: Nequi, Bancolombia, Daviplata, Bre-B
- **Futuro**: Stripe (tarjeta de crédito/débito)
- **Activación**: manual por el admin después de confirmar pago
- **Facturación**: mensual, sin contratos de permanencia

---

## 📝 Páginas Legales

- `/legal#privacidad` — Política de privacidad (Ley 1581 de 2012)
- `/legal#terminos` — Términos y condiciones
- `/legal#datos` — Datos y cumplimientos

---

## 🔜 Pendientes

1. **Dashboard para clientes**: según plan, acceso a métricas e info
2. **Integración Stripe**: pagos automatizados con tarjeta
3. **Marca registrada**: ante SIC Colombia (~$600K COP, 10 años)
4. **RAG** (futuro): para catálogos muy grandes (>100 productos), reducir tokens
5. **App móvil**: notificaciones push para dueños de negocio
