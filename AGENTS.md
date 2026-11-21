# AGENTS.md — Protocolo Operativo y Arquitectura de Código (NuncaCierro / nival.is-a.dev)

Este documento establece las reglas operativas, de arquitectura y de gestión de código que **todo asistente o agente de IA debe cumplir obligatoriamente** al trabajar en este repositorio.

---

## 1. Política Estricta de Control de Versiones (Git & Commits)

1. **Autorización Previa Obligatoria:**
   * **NUNCA** ejecutar `git commit` ni `git push` de manera autónoma o automática.
   * Siempre se debe pedir confirmación explícita al usuario antes de registrar cualquier cambio en el historial de Git.

2. **Commits solo tras Implementaciones Significativas:**
   * No realizar commits por cambios triviales, incompletos o en progreso.
   * Un commit solo se propone una vez que una característica, fix o cambio estructural esté **completamente implementado, probado y funcionando**.

3. **Formato Conventional Commits:**
   * Todos los mensajes deben seguir la convención estándar en minúsculas y en español o inglés técnico:
     * `feat(alcance): descripción clara`
     * `fix(alcance): corrección del error`
     * `docs(alcance): documentación o guías`
     * `test(alcance): adición o ajuste de tests`
     * `refactor(alcance): refactorización sin cambios funcionales`

4. **Archivos Protegidos y Secretos:**
   * Archivos `.env`, credenciales, claves de API y carpetas protegidas como `skills/` y `docs/` deben permanecer fuera del control de versiones (respetando [`.gitignore`](file:///.gitignore)).

---

## 2. Directrices de Frontend y UI (`nc-dashboard`)

1. **Cero Emojis en Componentes e Interfaz:**
   * Está **estrictamente prohibido el uso de emojis** en textos de interfaz, botones, tarjetas, encabezados o modales de la web.
   * Todos los elementos visuales e iconográficos deben utilizar exclusivamente la librería [`lucide-react`](file:///nc-dashboard/package.json).

2. **Diseño y Stack:**
   * Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + componentes accesibles tipo `shadcn/ui`.
   * Mantener siempre la consistencia visual y diseño profesional B2B.

3. **Garantía de Calidad y Validación Preventiva para Producción:**
   * **Antes de dar por completada cualquier modificación en frontend**, se debe ejecutar obligatoriamente:
     1. `pnpm lint`: Cero errores y advertencias de ESLint / React Hooks.
     2. `pnpm test`: Cobertura del 100% de la suite de pruebas unitarias e integración en verde.
     3. `pnpm build`: Verificación de que la compilación de producción (SSG/SSR Turbopack) termine con éxito (exit code 0).
   * Ningún cambio que rompa el linting, las pruebas o el build de producción es admisible.

---

## 3. Identidad Operativa y Propósito del Sistema

- **Arquitectura Multi-Tenant Agnóstica:** El agente conversacional es **100% agnóstico al dominio**. Su identidad, nombre, catálogo y comportamiento se configuran de forma dinámica por `tenant_id` a partir del perfil del negocio (`tenant.name`), sus prompts configurados y su base de conocimiento en la base de datos (`KnowledgeDocument` / `KnowledgeChunk`).
- **Instancia / Marca del Operador (`nival.is-a.dev` & Nunca Cierro):** Para el tenant de marca personal del operador, la base de conocimiento se gestiona cargando los documentos estructurados (`docs/knowledge/nicolas-valenzuela.md` y `docs/knowledge/nunca-cierro.md`) desde el dashboard. Ningún nombre de marca ni negocio está hardcodeado en los nodos ni en los prompts base del grafo.
- **Escalamiento Humano:** Ante interés comercial real, solicitudes de cotización, pedidos de demo o casos fuera de alcance (`escalation`), el sistema escala a humano y notifica de forma estructurada vía **Telegram** al canal configurado.

---

## 4. Arquitectura de Backend (`nc-api`) y Reglas Estrictas

1. **Stack Tecnológico:**
   * FastAPI + Python 3.12 gestionado con `uv`.
   * Base de datos PostgreSQL 16 asíncrona vía SQLAlchemy 2.0 (driver `asyncpg`) y migraciones con Alembic.
   * Redis 7 para debounce de mensajes entrantes, rate limiting distribuido y locks de corta duración (`redis.asyncio`). Prohibido almacenar rate limits o contadores anti-spam en memoria RAM de Python (`threading.Lock`).
   * Proveedores de LLM: OpenAI (`AsyncOpenAI`) y Groq (`AsyncOpenAI` con endpoint compatible) gestionados sin intermediarios innecesarios.

2. **Regla Estricta sobre LangChain:**
   * **PROHIBIDO:** No instalar ni importar **LangChain** (`langchain`, `langchain-core`, `langchain-community`, etc.).
   * Para la orquestación conversacional avanzada (Fase 2+) se utiliza directamente `langgraph`, el cliente `AsyncOpenAI` y clientes nativos.

3. **Estilo Arquitectónico:**
   * **Monolito modular** dentro de `nc-api/app/modules/`. No fragmentar en microservicios ni introducir brokers externos innecesarios (como Celery o RabbitMQ) cuando Redis + FastAPI/async resuelven el flujo.

4. **Verificación Continua:**
   * Antes de dar por finalizada cualquier tarea en backend, se debe ejecutar la suite de pruebas (`pytest`) asegurando que el 100% de los tests pasen en verde.
   * Mantener retrocompatibilidad estricta con `app/api/v1/` y `nc-dashboard/`.

---

## 5. Arquitectura Objetivo (`nc-api/app/`)

```text
nc-api/app/
├── api/
│   ├── webhooks.py                  # Ingress HTTP rápido: valida firma/conexión y despacha al engine
│   └── v1/                          # Endpoints administrativos existentes (no romper contratos)
├── core/
│   ├── config.py                    # Settings Pydantic (LLM, Redis, Postgres, Telegram handoff)
│   ├── redis_client.py              # Pool Redis compartido (debounce, rate limit, locks)
│   └── encryption.py                # Cifrado Fernet de credenciales
├── db/
│   ├── models.py
│   └── migrations/                  # Migraciones Alembic limpias y reversibles
└── modules/
    ├── engine/                      # Orquestación agnóstica de canal (reemplaza lógica en handlers)
    │   ├── schemas.py               # InboundMessage, OutboundMessage, HandoffEvent, ChannelAdapter
    │   ├── service.py               # Dedup atómica, advisory lock, cooldown admin 72h, cupos y envío
    │   └── debounce.py              # Agrupación en Redis sin bloquear el ciclo de respuesta HTTP
    ├── agent_graph/                 # Grafo conversacional en LangGraph (Fase 2)
    │   ├── state.py                 # TypedDict / modelo AgentState
    │   ├── graph.py                 # Definición y compilación del StateGraph
    │   ├── nodes.py                 # classify_intent, retrieve_or_plan, reason_with_tools, prepare_handoff
    │   ├── prompts.py               # System prompt modular (identidad dinámica {tenant_name} + formato breve)
    │   └── checkpointer.py          # Persistencia de estado/resumen en Postgres
    ├── knowledge/                   # Conocimiento / RAG limpio aislado por tenant_id (Fase 3)
    │   ├── service.py               # Ingesta (PDF, URL, MD) y recuperación selectiva de fragmentos verificables
    │   └── schemas.py               # Validación Pydantic de documentos y chunks
    ├── tools/                       # Function calling explícito con validación Pydantic (Fase 3)
    │   ├── registry.py              # Registro y ejecución segura de tools
    │   ├── knowledge_tool.py        # Búsqueda de guías y catálogos / RAG bajo demanda por tenant_id
    │   └── handoff_tool.py          # Escalamiento a humano + notificación estructurada por Telegram
    ├── evolution/                   # Solo parser de webhook + EvolutionAdapter (sendText, composing)
    ├── telegram/                    # Parser/adapter de bot + canal de notificaciones de escalamiento
    └── [auth, tenants, agents, conversations, platform_connections, plans...]
```

---

## 6. Reglas de Diseño del Agente y Prompts

1. **Cero Prompts Monolíticos:** No volcar catálogos completos, FAQs extensas ni documentación pesada en el system prompt base. Usar recuperación RAG (`retrieve_or_plan_node` / `knowledge_tool`) para inyectar contexto bajo demanda según el tenant.
2. **Formato de Salida (WhatsApp / Chat):**
   - Párrafos cortos de 1 a 3 líneas.
   - Sin bloques pesados de Markdown (evitar encabezados, tablas o listas largas en respuestas conversacionales).
   - Máximo una pregunta clara por turno para guiar la conversación sin abrumar.
3. **Resiliencia y Concurrencia Obligatoria:**
   - Mantener `pg_advisory_xact_lock` por `{connection_id}:{external_user_id}` para serializar concurrencia por chat.
   - Mantener deduplicación atómica en PostgreSQL (`ON CONFLICT (platform_connection_id, external_message_id) DO NOTHING`).
   - Mantener el **Admin Cooldown de 72 horas** cuando un humano responde manualmente (`from_me`).
   - Mantener degradación suave a respuestas programadas/FAQ si un tenant supera su cupo mensual de IA.

---

## 7. Hoja de Ruta por Fases (Ejecución Incremental)

- **Fase 1 (Desacoplamiento de Canal y Redis):** Crear `modules/engine/` con `InboundMessage` y `OutboundMessage`. Extraer la orquestación de `modules/evolution/handler.py` hacia `engine/service.py` para que Evolution y Telegram compartan el mismo flujo. Migrar `rate_limiter.py` y `anti_spam.py` de memoria RAM a Redis y desacoplar el debounce de la respuesta HTTP del webhook.
- **Fase 2 (Grafo LangGraph y Persistencia):** Implementar `modules/agent_graph/` con `AgentState`, nodos base y persistencia de estado/resumen en Postgres. Reemplazar la llamada directa al LLM en `engine/service.py` por la ejecución del grafo compilado.
- **Fase 3 (Identidad, Tools y Conocimiento):** Implementar `modules/tools/` (`search_knowledge`, `consult_nunca_cierro`, `escalate_to_human_telegram`) y `modules/knowledge/`. Ajustar prompts para operar como asistente de Nicolás Valenzuela (`nival.is-a.dev`).
- **Fase 4 (Limpieza y Observabilidad):** Retirar tablas/modelos legado (`prompts`, `whatsapp_numbers`) mediante migración Alembic y añadir trazas/métricas por nodo y tool.

---

## 8. Estándar para Creación Inmediata de Demos de Nuevos Clientes

Cuando el usuario proporcione información sobre un prospecto o solicite crear una nueva demostración comercial:
1. **Lectura Previa Obligatoria de la Plantilla:**
   * Consultar y seguir estrictamente la guía y plantilla en [`docs/cliente-demo-standard.md`](file:///docs/cliente-demo-standard.md) antes de generar el código.
2. **Creación del Archivo Aislado:**
   * Crear un único archivo en `nc-dashboard/lib/demos/[slug].ts` con el slug en minúsculas y kebab-case (ej. `clinica-robles.ts`).
   * Cumplir con la interfaz tipada `DemoProfile` de [`lib/demos/types.ts`](file:///nc-dashboard/lib/demos/types.ts).
3. **Cero Configuración Manual:**
   * No editar rutas, ni `index.ts`, ni diccionarios manuales; la autocarga e indexación en Next.js App Router es 100% dinámica.
4. **Regla Estricta de Cero Emojis:**
   * Prohibido cualquier emoji en títulos, servicios, FAQs o cualquier texto del perfil.
5. **Validación Preventiva Completa antes de Entregar:**
   * Ejecutar obligatoriamente `pnpm lint`, `pnpm test` y `pnpm build` en `nc-dashboard`.
   * Entregar la demostración lista en la URL `/demo/[slug]`.
