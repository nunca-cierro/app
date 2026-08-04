# Evolution API + NuncaCierro — Guía de Integración

## Tabla de Contenidos

1. [¿Qué cambia con Evolution API?](#qué-cambia-con-evolution-api)
2. [Arquitectura — el flujo completo](#arquitectura--el-flujo-completo)
3. [Prerrequisitos](#prerrequisitos)
4. [Setup rápido — 4 pasos](#setup-rápido--4-pasos)
5. [Referencia de endpoints](#referencia-de-endpoints)
6. [Automatización](#automatización)
7. [Troubleshooting](#troubleshooting)

---

## ¿Qué cambia con Evolution API?

**Sin Evolution API** (tu setup actual):

```
Usuario → Meta Cloud API → nc-api → Groq → Meta Cloud API → Usuario
```

**Con Evolution API**:

```
Usuario → Evolution API → nc-api → Groq → Evolution API → Usuario
```

Evolution API **reemplaza a Meta Cloud API como gateway**. Tu bot (tenants, agentes, business_config, respuestas con Groq) funciona EXACTAMENTE igual. Solo cambia cómo entran y salen los mensajes.

**Ventajas de Evolution API:**

- Sin verificación de Meta (webhooks, tokens, WABA)
- Delay simulado + estado "composing" (anti-baneo)
- Control total sobre la infraestructura
- Podés tener mil números sin pedir permiso a nadie

---

## Arquitectura — el flujo completo

```
                         ┌─────────────────────────────┐
                         │    Evolution API Server     │
                         │  (tu instancia en Railway)  │
                         │                             │
                         │  Instancia: "nuncacierro"   │
                         └──────────┬──────────────────┘
                                    │ ① messages.upsert
      POST /webhook/evolution/{id}  │
         ┌──────────────────────────▼──────────────────┐
         │              nc-api (FastAPI)               │
         │                                             │
         │  webhooks.py ─── rutea por platform         │
         │       │                                     │
         │       ▼                                     │
         │  evolution/webhook.py ─── extrae mensaje    │
         │       │           • remoteJid → número      │
         │       │           • ignora fromMe=true      │
         │       │           • solo texto              │
         │       ▼                                     │
         │  evolution/handler.py ─── pipeline IA       │
         │       │                                     │
         │       ├── Busca/conversación DB             │
         │       ├── Guarda mensaje inbound            │
         │       ├── Carga historial (últimos 6)       │
         │       ├── Build system prompt (business_cfg)│
         │       ├── groq_client.generate() ←── Groq   │
         │       │                                     │
         │       ▼                                     │
         │  evolution/adapter.py ─── envía respuesta   │
         │       │                                     │
         │       ② /chat/sendPresence ─── "composing"  │
         │       ③ delay 2000ms (anti-baneo)           │
         │       ④ /message/sendText ─── respuesta     │
         └──────────┬──────────────────────────────────┘
                    │
                    ▼
         evolution-api-production-9fb2.up.railway.app
                    │
                    ▼
              Usuario WhatsApp
```

### Mitigación de baneo (ya integrada)

El adapter de Evolution hace **3 cosas** antes de cada respuesta:

| Paso | Acción                        | Por qué                                           |
| ---- | ----------------------------- | ------------------------------------------------- |
| 1    | Envía presencia `"composing"` | Simula que un humano está escribiendo             |
| 2    | Espera 2 segundos             | WhatsApp penaliza respuestas instantáneas de bots |
| 3    | Envía el texto                | Con `linkPreview: false` para evitar bans         |

Podés ajustar los tiempos desde las credenciales o por kwargs al llamar `send_message()`.

---

## Prerrequisitos

1. **Python 3.12+** con [uv](https://docs.astral.sh/uv/)
2. **PostgreSQL** corriendo local (tu `.env` apunta a `localhost:5432`)
3. **Una instancia de Evolution API v2.x** — mañana la creás
4. **API key de Groq** — ya la tenés en `.env`
5. **ngrok** (o similar) para exponer tu local al webhook de Evolution

---

## Setup rápido — 4 pasos

### Paso 1: Levantar nc-api local

```bash
cd nc-api

# Asegurate que tu .env tenga las credenciales de Groq
# (ya las tenés configuradas)

# Iniciar migraciones si no lo hiciste
uv run alembic upgrade head

# Arrancar servidor
uv run uvicorn app.main:app --reload --port 8000
```

Verificá que responda:

```bash
curl http://localhost:8000/
# → {"service":"NuncaCierro WhatsApp Bot","version":"2.0.0","status":"ok",...}
```

### Paso 2: Exponer tu local con ngrok

```bash
ngrok http 8000
# → https://abc123.ngrok.io
```

Copiá esa URL (la de ngrok). La vas a usar para que Evolution API te mande los webhooks.

### Paso 3: Crear un tenant + agente + conexión Evolution

Todo se hace contra tu API local. Usá estos comandos exactos (cambiá los UUIDs):

```bash
# ── 3a. Crear tenant ─────────────────────────────────────
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@test.com",
    "password": "123456",
    "tenant_name": "Mi Negocio"
  }' | jq .

# Guardá el tenant_id de la respuesta
```

Después creás el agente con tu negocio:

```bash
# ── 3b. Login para obtener token ─────────────────────────
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"123456"}' | jq -r '.access_token')

echo "Token: $TOKEN"

# ── 3c. Crear agente con business_config ─────────────────
curl -s -X POST http://localhost:8000/api/v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "<tenant_id>",
    "name": "Asistente Demo",
    "model": "openai/gpt-oss-120b",
    "temperature": 0.7,
    "max_tokens": 512,
    "business_config": {
      "instructions": "Responde amablemente y ofrece ayuda.",
      "business_info": {
        "name": "Mi Negocio Demo",
        "description": "Venta de productos artesanales",
        "schedule": "Lun-Vie 9am-6pm",
        "phone": "573001234567"
      },
      "products_services": [
        {"name": "Producto A", "price": "25000"},
        {"name": "Producto B", "price": "45000"}
      ],
      "faq": [
        {"question": "¿Hacen envíos?", "answer": "Sí, a todo el país"}
      ],
      "tone": "Profesional pero cercano, como un vendedor de barrio.",
      "keywords_to_escalate": ["hablar con humano", "queja", "reclamo"],
      "fallback_message": "En breve un asesor te atiende."
    }
  }' | jq .

# Guardá el id del agente
```

### Paso 4: Crear la conexión Evolution + registrar webhook

```bash
# ── 4a. Crear la conexión Evolution ─────────────────────
CONN_ID=$(curl -s -X POST http://localhost:8000/api/v1/platform-connections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "<tenant_id>",
    "platform_type": "evolution",
    "display_name": "WhatsApp Evolution",
    "credentials": {
      "base_url": "https://evolution-api-production-9fb2.up.railway.app",
      "api_key": "<tu-api-key>",
      "instance_name": "nuncacierro"
    }
  }' | jq -r '.id')

echo "Connection ID: $CONN_ID"

# ── 4b. Registrar webhook en Evolution (un solo paso) ───
# El webhook se registra con header de autenticación (apikey) — la
# validación del lado de nc-api es fail-closed: sin el header correcto,
# el webhook se rechaza con 403.
curl -s -X POST "http://localhost:8000/api/v1/platform-connections/$CONN_ID/register-evolution-webhook?base_url_override=https://abc123.ngrok.io" \
  -H "Authorization: Bearer $TOKEN" | jq .

# → {"status": "ok", "webhook_url": "https://abc123.ngrok.io/webhook/evolution/<id>"}
```

Listo. **Ya está funcionando.** Cada vez que alguien te escriba al WhatsApp conectado a esa instancia de Evolution, el mensaje llega a tu backend, Groq lo procesa, y la respuesta vuelve con composing + delay.

---

## Sin ngrok — probar directo con curl

Si no tenés ngrok, podés simular el webhook manualmente para probar el pipeline completo sin esperar a Evolution:

```bash
# Primero necesitás el connection_id y tenant_id de arriba
# Importante: la validación del webhook es fail-closed — enviá el header
# `apikey` con la misma key guardada en las credenciales de la conexión.

curl -s -X POST "http://localhost:8000/webhook/evolution/$CONN_ID" \
  -H "Content-Type: application/json" \
  -H "apikey: <tu-api-key>" \
  -d '{
    "event": "messages.upsert",
    "instance": "nuncacierro",
    "data": {
      "key": {
        "remoteJid": "573001234567@s.whatsapp.net",
        "fromMe": false,
        "id": "test-msg-001"
      },
      "pushName": "Cliente Demo",
      "message": {
        "conversation": "Hola, ¿qué productos tienen?"
      },
      "messageType": "conversation"
    }
  }'
```

Eso:

1. Crea/encuentra la conversación
2. Guarda el mensaje en DB
3. Llama a Groq con el business_config
4. Intenta enviar la respuesta vía EvolutionAdapter (va a fallar porque no hay instancia real, pero el pipeline corre completo)
5. Guarda la respuesta como "failed" en DB

Para probar sin necesidad de Evolution API corriendo, podés inspeccionar la DB:

```bash
# Ver la conversación creada
curl -s "http://localhost:8000/api/v1/conversations?tenant_id=<tenant_id>" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Referencia de endpoints

### Nuevos endpoints (esta integración)

| Método | Ruta                                                           | Descripción                                       |
| ------ | -------------------------------------------------------------- | ------------------------------------------------- |
| `POST` | `/webhook/evolution/{connection_id}`                           | Webhook entrante de Evolution                     |
| `POST` | `/api/v1/platform-connections/{id}/register-evolution-webhook` | Configura el webhook en Evolution automáticamente |

### Endpoints existentes que usás (sin cambios)

| Método | Ruta                           | Descripción                                          |
| ------ | ------------------------------ | ---------------------------------------------------- |
| `POST` | `/api/v1/platform-connections` | Crear conexión Evolution (con credenciales cifradas) |
| `POST` | `/api/v1/agents`               | Crear agente con business_config                     |
| `POST` | `/api/v1/auth/register`        | Crear tenant                                         |
| `POST` | `/api/v1/auth/login`           | Obtener token JWT                                    |
| `GET`  | `/api/v1/conversations`        | Ver conversaciones                                   |

---

## Automatización

### Registro de webhook en un paso

El endpoint `POST /{connection_id}/register-evolution-webhook` hace todo automáticamente:

1. Descifra las credenciales
2. Llama a `POST /instance/setWebhook/{instance}` de Evolution API
3. Configura solo el evento `messages.upsert`
4. Guarda la URL en `extra_data`

```bash
# Solo connection_id y la URL pública de tu backend
curl -X POST "https://tu-api.com/api/v1/platform-connections/{id}/register-evolution-webhook?base_url_override=https://tu-dominio.com"
```

### Script de setup completo

Podés crear un script que haga todo en secuencia (crear tenant → crear agente → crear conexión → registrar webhook). Si querés, lo escribo ahora.

---

## Troubleshooting

| Problema                               | Causa probable                                                                   | Solución                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `"Webhook validation failed"`          | El `instance` del payload no coincide con el `instance_name` de las credenciales | Verificá que el instance_name esté bien escrito en ambos lados                                               |
| `403` en el webhook de Evolution       | El header `apikey` no coincide o falta (validación fail-closed)                  | Corré `register-evolution-webhook` de nuevo — el registro ahora envía el header de autenticación a Evolution |
| `"Connection not found"`               | El `connection_id` en la URL no existe o está mal formateado                     | Verificá que sea un UUID válido                                                                              |
| `"Evolution API unreachable"`          | No hay conexión al servidor de Evolution                                         | Revisá que `base_url` sea correcto y alcance                                                                 |
| El mensaje llega pero no responde      | Problema con Groq o la DB                                                        | Revisá los logs con `LOG_LEVEL=DEBUG`                                                                        |
| La respuesta llega sin composing/delay | El adapter falló en presence pero no es fatal                                    | Revisá logs de `Evolution presence failed (non-fatal)`                                                       |
| No llegan mensajes al webhook          | Evolution no tiene el webhook configurado                                        | Corré `register-evolution-webhook` de nuevo                                                                  |

---

## Runbook — migración a webhooks autenticados (fail-closed)

La validación de webhooks es **fail-closed**: si la conexión tiene una key
(propia o la global `EVO_API_KEY`), Evolution debe enviar el header
`apikey` en cada webhook; si falta o no coincide → `403`. Las conexiones
creadas ANTES de este cambio registraron su webhook sin header y serían
rechazadas tras el deploy. Este runbook lo resuelve sin ventana de corte.

### Orden de deploy recomendado (ventana cero)

1. **Antes del deploy**, con el código nuevo en la máquina que tenga acceso
   a la DB de producción (mismas env vars: `DATABASE_URL`,
   `ENCRYPTION_KEY`, `EVO_API_KEY`, `EVO_INTERNAL_BASE_URL`):

   ```bash
   # Paso 1 — plan (no toca Evolution, solo lista):
   uv run python -m scripts.backfill_evolution_webhooks

   # Paso 2 — registra los webhooks con header de auth:
   uv run python -m scripts.backfill_evolution_webhooks --apply
   ```

   Si Evolution NO está en la misma red Docker que nc-api:

   ```bash
   uv run python -m scripts.backfill_evolution_webhooks --apply \
     --webhook-base-url https://api.nuncacierro.com
   ```

   El script es **idempotente** (re-ejecutar es seguro), solo toca
   conexiones `evolution` con estado `active`, y **nunca imprime keys**.

2. **Deploy** del código (validación fail-closed + payload v2).

3. **Verificación**:
   ```bash
   curl -s http://localhost:8000/health      # liveness
   curl -s http://localhost:8000/ready       # readiness (DB)
   ```
   Y un mensaje real: debe procesarse (no `403` en el webhook).

> Fallback si ya deployaste: corré el script igual; Evolution reintenta los
> webhooks fallidos con backoff exponencial (`WEBHOOK_RETRY_*`), así que
> una ventana corta se auto-recupera.

### Conexiones que el script omite

- `status != active` → se omiten (se re-registran al reconectar la instancia
  con `connect-evolution`).
- Sin `instance_name`/`base_url` en credenciales → se reportan para revisión.
- Sin key efectiva (ni propia ni `EVO_API_KEY`) → **no se pueden autenticar**:
  quedan con validación por instancia (legacy). Si querés cerrar eso, asigná
  una key a la conexión y re-coré el script.

### Migración de agentes al nuevo modelo (deprecated)

Groq deprecó `llama-3.3-70b-versatile` (shutdown **2026-08-16**). El default
es `openai/gpt-oss-120b`. La migración de datos (revisión `b1c2d3e4f5a6`)
solo reescribe filas con el valor deprecated exacto; los modelos custom
nunca se tocan. Además el runtime rutea ese valor al default
(defensa en profundidad), así que podés deployar y migrar después:

```bash
uv run alembic upgrade head        # aplica constraint + migración de agentes
```

Rollback de agentes: `uv run alembic downgrade b1c2d3e4f5a6:down` (aprox.:
también revierte agentes creados con el nuevo default después de migrar).

### Runbook — duplicados en `messages` (constraint de dedup)

La migración `a1b2c3d4e5f6` **aborta** si existen grupos duplicados de
`(platform_connection_id, external_message_id)` — nunca borra datos. Si
aborta:

1. Detectá los duplicados:
   ```sql
   SELECT platform_connection_id, external_message_id, COUNT(*) AS n
   FROM messages
   WHERE external_message_id IS NOT NULL
   GROUP BY 1, 2 HAVING COUNT(*) > 1
   ORDER BY n DESC;
   ```
2. Decidí qué fila conservar (la más antigua suele ser la correcta) y
   eliminá/archivá el resto de forma explícita, o anotá el id duplicado en
   `payload` antes de borrar. No borres a ciegas: revisá cada grupo.
3. Re-coré `uv run alembic upgrade head`.

---

## Riesgos y plan de contingencia

### ¿Por qué Evolution API y no Meta Cloud API oficial?

**Meta Cloud API** requiere:
- Verificación del negocio (cámara de comercio, RUT, etc.)
- Aprobación de caso de uso (puede tardar días/semanas)
- Cumplimiento estricto de políticas anti-spam
- Costo por mensaje después de las primeras 1,000 conversaciones/mes

**Evolution API** es una solución self-hosted que:
- No requiere verificación (usás tu propio número de WhatsApp)
- Es gratis (solo el costo del servidor)
- Funciona igual que WhatsApp Web (escaneás QR)
- Te da control total

### Riesgos de Evolution API

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| WhatsApp cambia el protocolo interno | Media | Alto | La abstracción en `adapter.py` permite migrar en 1-2 semanas |
| Evolution API deja de mantenerse | Baja | Alto | Alternativas: whatsapp-web.js, Baileys (mismo enfoque) |
| Número baneado por spam | Media | Alto | Implementar delay anti-baneo, respetar horas, no enviar mensajes masivos sin opt-in |
| Sesión se desconecta frecuentemente | Baja | Medio | Monitorear con health checks, auto-reconectar si es posible |

### Plan de contingencia: migrar a otro proveedor

La arquitectura ya está preparada para cambiar de proveedor:

```
nc-api/
├── app/modules/
│   ├── evolution/        ← Gateway actual (adapter.py, handler.py)
│   ├── telegram/         ← Otro gateway (ejemplo)
│   └── [futuro]/         ← Nuevo gateway (misma interfaz)
```

**Pasos para migrar:**
1. Crear nuevo módulo `app/modules/[nuevo_gateway]/` con `adapter.py` y `handler.py`
2. Implementar la misma interfaz: `send_message()`, `validate_webhook()`, etc.
3. Agregar endpoint de webhook: `POST /webhook/[nuevo_gateway]/{id}`
4. Actualizar `PlatformConnection.platform_type` para soportar el nuevo tipo
5. Migrar conexiones existentes (o crear nuevas)

**Tiempo estimado:** 1-2 semanas de trabajo.

**Alternativas si Evolution falla:**
- **whatsapp-web.js** (Node.js, mismo enfoque que Evolution)
- **Baileys** (TypeScript, librería pura, más ligero)
- **Twilio WhatsApp** (oficial, costo por mensaje)
- **360dialog** (oficial, costo mensual)

---

## ¿Qué sigue después de la prueba?

Cuando mañana crees la instancia de Evolution:

1. Creás la instancia en tu Evolution API
2. Vincular el número WhatsApp
3. Creás la conexión en nc-api (paso 4a)
4. Corrés `register-evolution-webhook` (paso 4b)
5. Probás con un mensaje real desde WhatsApp

Todo esto sin tocar más el código. Si algo no funciona, revisamos los logs y ajustamos.
