# 🤖 NuncaCierro — WhatsApp Bot API

Backend en **FastAPI** para el bot multicliente de WhatsApp de NuncaCierro. Automatización WhatsApp para negocios colombianos con respuestas inteligentes vía **Groq (LLaMA 3 70B)**.

## ✨ Features

- **Multi-cliente** — cada negocio tiene su propia configuración (JSON)
- **Keyword detection** — respuestas automáticas SIN costo de IA para preguntas frecuentes
- **AI fallback** — Groq API (LLaMA 3 70B, gratis, 30 req/min) para preguntas no reconocidas
- **WhatsApp Cloud API oficial** — webhooks, mensajes, verificación
- **Sin base de datos** — archivos JSON para configuración de negocios
- **Logging estructurado** con loguru
- **Rate limiting** — monitoreo del tier gratis de Groq
- **Conexiones de plataforma** — Telegram/WhatsApp con credenciales cifradas

## 🚀 Quick Start

### Prerrequisitos

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (gestor de paquetes)
- Cuenta de [Meta for Developers](https://developers.facebook.com/)
- API key de [Groq](https://console.groq.com/)

### Instalación

```bash
# Clonar
git clone <repo-url> nc-api
cd nc-api

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor
uv run python main.py
```

El servidor arranca en `http://localhost:8000`.

### Verificar funcionamiento

```bash
curl http://localhost:8000/health
# → {"status": "ok", "service": "NuncaCierro WhatsApp Bot"}
```

---

## 🔗 Platform Connections (API)

Resumen de lo necesario para el dashboard.

### Validar token de Telegram

```
POST /api/v1/platform-connections/validate-telegram-token
```

Body:

```json
{
  "bot_token": "1234567890:ABCdefGHIjklmNOPqrSTUvWXyz"
}
```

Respuesta:

```json
{
  "valid": true
}
```

### Esquema PlatformConnection (respuesta)

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "platform_type": "telegram",
  "display_name": "Bot de Soporte",
  "extra_data": {
    "bot_username": "MyBot",
    "bot_token": "123:ABC"
  },
  "status": "active",
  "is_primary": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## 🔌 Configurar WhatsApp Webhook

1. Ve a [Meta for Developers](https://developers.facebook.com/) → WhatsApp → Configuration
2. En **Webhook**, ingresa: `https://tu-dominio.com/webhook`
3. Verify token: el mismo que pusiste en `WHATSAPP_VERIFY_TOKEN`
4. Suscríbete al campo `messages`

## 📁 Añadir un negocio

### Rápido (CLI interactivo)

```bash
uv run python -m bot.setup
```

Te guía paso a paso: nombre, credenciales WhatsApp, horario y descripción. Genera keywords placeholder y un system prompt base. El archivo se crea automáticamente en `businesses/`.

### Manual

Crea un archivo JSON en `businesses/`:

```json
{
  "business_name": "Mi Negocio",
  "phone_number_id": "123456789",
  "whatsapp_token": "EAAx...",
  "whatsapp_phone_number_id": "123456789",
  "hours": "Lunes a Viernes 9am-6pm",
  "description": "Descripción corta",
  "keywords": {
    "horario|horarios": "Nuestro horario es {hours}",
    "precio|precios": "Nuestros precios inician en $X"
  },
  "system_prompt": "Eres un asistente de atención al cliente..."
}
```

**Importante**: cada negocio necesita sus propias credenciales de WhatsApp Cloud API
(``whatsapp_token`` y ``whatsapp_phone_number_id``). Ya no se usa el token global del ``.env``.

## 🐳 Deploy

### Railway / Render / Fly.io

```bash
# El requirements.txt ya está generado
# Configura las variables de entorno en la plataforma
# Comando de inicio: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Variables de entorno requeridas:

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook |
| `WHATSAPP_API_VERSION` | Versión de la API (default: v22.0) |
| `GROQ_API_KEY` | API key de Groq |

## 📖 Stack técnico

- **FastAPI 0.136+** — framework web async
- **Groq SDK 1.2+** — cliente oficial de Groq
- **httpx** — cliente HTTP async
- **loguru** — logging estructurado
- **pydantic-settings** — configuración por entorno
- **uvicorn** — servidor ASGI

## 🧠 Arquitectura

```
WhatsApp Cloud API ──► GET /webhook (verificación)
                     ──► POST /webhook (mensajes)
                              │
                              ▼
                         handler.py ──► responder.py
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                      match_keyword()              groq_client.generate()
                      (gratis, instantáneo)         (LLaMA 3 70B)
                              │                             │
                              └──────────────┬──────────────┘
                                             ▼
                                       whatsapp.py
                                    send_text_message()
```

## 📄 Licencia

**MIT** — NuncaCierro © 2026
