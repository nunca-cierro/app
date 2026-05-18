# nc-api — NuncaCierro WhatsApp Bot

## Project Overview

Backend API para el bot de WhatsApp de **NuncaCierro**, un servicio de automatización WhatsApp para negocios colombianos. Construido con **FastAPI** (Python 3.12).

### Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | FastAPI 0.136+ |
| **Runtime** | Python 3.12 (via uv) |
| **AI** | Groq API — LLaMA 3 70B (gratis, 30 req/min) |
| **WhatsApp** | Meta WhatsApp Cloud API v22.0 |
| **HTTP Client** | httpx (async) |
| **Config** | pydantic-settings + .env |
| **Logging** | loguru |
| **Server** | uvicorn |

### Architecture

```
webhook (WhatsApp Cloud API)
    │
    ▼
bot/router.py ──── GET /webhook (verification)
                        POST /webhook (messages)
    │
    ▼
bot/handler.py ──── extract_message() → handle_incoming()
    │
    ▼
bot/responder.py ── match_keyword()  → canned response (FREE)
                    respond()        → groq_client (fallback AI)
    │                        ▲
    ├── bot/groq_client.py ──┘
    │
    ▼
bot/whatsapp.py ──── send_text_message() → WhatsApp Cloud API
```

### Decisiones Técnicas

**1. Keyword matching primero, Groq como fallback**  
Las keywords se resuelven SIN llamadas HTTP externas (gratis, instantáneo). Solo cuando el mensaje no coincide con ninguna keyword se invoca Groq. Esto minimiza costos y latencia.

**2. Rate limiting en GroqClient**  
El tier gratis de Groq permite 30 req/min. `GroqClient` mantiene un sliding window de timestamps y loguea warnings al acercarse al límite. No bloquea — solo advierte.

**3. Multi-cliente sin base de datos**  
Cada negocio es un archivo JSON en `businesses/`. El `phone_number_id` del webhook se resuelve al filename del JSON. En producción se reemplazaría por una DB.

**4. No guardar estado**  
Sin sesiones, sin historial de conversaciones (por ahora). Cada mensaje se procesa de forma independiente.

**5. Siempre responder 200 a WhatsApp Webhook**  
Incluso si hay error interno, se responde 200 para evitar que WhatsApp reintente. El error se loguea y se maneja internamente.

### Project Structure

```
nc-api/
├── main.py                  # FastAPI entry point + uvicorn runner
├── bot/
│   ├── __init__.py
│   ├── router.py            # GET/POST /webhook, GET /health
│   ├── handler.py           # Parse + process incoming messages
│   ├── responder.py         # Keyword match → AI fallback
│   ├── groq_client.py       # Groq API client + rate limiting
│   └── whatsapp.py          # WhatsApp Cloud API sender + verify
├── config/
│   ├── __init__.py
│   └── settings.py          # pydantic-settings loader
├── businesses/
│   ├── __init__.py
│   ├── restaurante.json
│   ├── barberia.json
│   └── dental.json
├── .env.example
├── pyproject.toml
├── requirements.txt
├── AGENTS.md
└── README.md
```

### Commands

```bash
# Run locally (dev)
uv run python main.py

# Run with uvicorn directly
uv run uvicorn main:app --reload --port 8000

# Add dependency
uv add <package>

# Export requirements
uv export --format requirements-txt --no-hashes > requirements.txt

# Test (when tests exist)
uv run pytest
```

### Convenciones

- **Python 3.12+** — type hints obligatorios, `from __future__ import annotations`
- **Async first** — todas las I/O son async (httpx, groq SDK)
- **Logging con loguru** — usar `logger.info()`, `logger.error()` con kwargs estructurados
- **pydantic-settings** para config, no `os.getenv()` directo
- **Business JSON** — UTF-8, sin BOM, indentado 2 espacios
- **Sin DB** — estado en archivos JSON `businesses/` hasta Fase 3

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check → `{"status": "ok"}` |
| `GET` | `/webhook` | Verificación WhatsApp Cloud API |
| `POST` | `/webhook` | Recibir mensajes de WhatsApp |

### Environment Variables

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_TOKEN` | Token de acceso a Meta WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de teléfono en Meta |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook |
| `WHATSAPP_API_VERSION` | Versión de la API (default: v22.0) |
| `GROQ_API_KEY` | API key de Groq |
| `GROQ_MODEL` | Modelo de Groq (default: llama3-70b-8192) |
| `GROQ_MAX_TOKENS` | Tokens máximos por respuesta (default: 512) |
| `GROQ_TEMPERATURE` | Temperatura del modelo (default: 0.7) |
| `APP_PORT` | Puerto del servidor (default: 8000) |
| `APP_HOST` | Host (default: 0.0.0.0) |
| `LOG_LEVEL` | Nivel de logging (default: INFO) |
