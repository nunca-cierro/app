# Roadmap NuncaCierro — Pendientes y Mejoras

> Última actualización: 2026-09-15

---

## 🔴 FASE 1 — Antes de Vender (Urgente)

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1 | **Deploy fix cooldown admin** | ✅ Desplegado | `handler.py` — cooldown per-chat usando `remote_jid` normalizado. |
| 2 | **Debounce con Redis** | ✅ Desplegado | Agrega mensajes rápidos en una sola inferencia LLM (ventana 3s). |
| 3 | **Framework prompt proactivo** | ✅ Aprobado | `docs/AGENT-PROMPT-FRAMEWORK.md` — adaptar plantillas cuando llegue cliente. Bot pasa de reactivo a agente comercial. |
| 4 | **Flujo de citas (Nivel 1)** | 🔲 Sin empezar | Prompt del bot + lógica de recolección fecha/hora + notificación al admin por WhatsApp. |
| 5 | **Catálogo de servicios por tenant** | 🔲 Sin empezar | El bot necesita saber QUÉ se agenda, a qué precio, y duración. Modelar en `business_config`. |

---

## 🟡 FASE 2 — Funcionalidades de Escalamiento

| #   | Tarea                                  | Estado         | Notas                                                                                                                                |
| --- | -------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 5   | **Integración Google Calendar**        | 🔲 Sin empezar | OAuth + lectura de disponibilidad + creación de eventos. Endpoints necesarios: `/auth-url`, `/callback`, `/availability`, `/events`. |
| 6   | **Recordatorios automáticos**          | 🔲 Sin empezar | 24h antes de la cita, confirmar asistencia. Requiere un scheduler (Celery, APScheduler, o cron job).                                 |
| 7   | **Notificación al admin por WhatsApp** | 🔲 Sin empezar | Cuando un cliente agenda, el bot envía un mensaje al JID del admin con los datos de la cita. Admin responde CONFIRMAR/RECHAZAR.      |
| 8   | **Política de cancelación**            | 🔲 Sin empezar | Configurable por tenant. Ej: "cancelar con 24h de anticipación".                                                                     |

---

## 🟢 FASE 3 — Mejoras Técnicas (Auditoría SDD)

Basado en la auditoría técnica propuesta por el usuario:

### 3.1 Auditoría del System Prompt y Configuración

| #   | Tarea                                        | Estado         | Notas                                                                                                                                |
| --- | -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 9   | **Estructurar datos dinámicos desacoplados** | 🔲 Sin empezar | Separar instrucciones de comportamiento de datos del negocio (servicios, precios, FAQ). Evitar que el prompt crezca indefinidamente. |
| 10  | **Anti-alucinaciones**                       | 🔲 Sin empezar | Instrucciones para que el invente servicios no listados. Validar respuestas contra el catálogo antes de enviar.                      |

### 3.2 Gestión de Audio / Notas de Voz

| #   | Tarea                      | Estado         | Notas                                                                                                         |
| --- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| 11  | **Transcripción de audio** | 🔲 Sin decidir | Opciones: Whisper auto-alojado, Groq Whisper API, OpenAI Whisper API. Evaluar costo vs. calidad vs. latencia. |

### 3.3 Buffer de Mensajes Fragmentados

| #   | Tarea                              | Estado         | Notas                                                                                                                                                                   |
| --- | ---------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | **Debounce / Message Aggregation** | ✅ Desplegado  | Redis sorted sets, ventana 3s, graceful fallback. Commit `cb0476f`.                                                                                                     |

### 3.4 Sincronización de Templates

| #   | Tarea                                   | Estado         | Notas                                                                                                                          |
| --- | --------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 13  | **Sincronizar agente con template**     | 🔲 Sin empezar | Botón superadmin en dashboard. Endpoint `POST /agents/{id}/sync-template`. Modal de confirmación + diff antes de sobreescribir. Riesgo: perder personalizaciones manuales. Deferred hasta 3-5 clientes reales. (~2-3h) |

### 3.5 Ciclo de Vida de la Conversación

| #   | Tarea                           | Estado         | Notas                                                                                                             |
| --- | ------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| 14  | **Máquina de estados mejorada** | 🔲 Sin empezar | Estados: activa, esperando respuesta, derivada a humano, cerrada. Ya hay `escalated` pero falta formalizar.       |
| 15  | **Follow-ups automatizados**    | 🔲 Sin empezar | Si un cliente no responde en X horas, enviar mensaje de seguimiento. Ej: "Hola, ¿le sirvió la info que le envié?" |
| 16  | **Pausa del bot por operador**  | 🔲 Sin empezar | Cuando un humano toma el chat, el bot se pausa (ya parcialmente implementado con cooldown de 72h).                |

---

## 📊 Métricas (Pendiente de Diseño)

| #   | Tarea                     | Estado         | Notas                                                                                                            |
| --- | ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| 16  | **Dashboard de métricas** | 🔲 Sin empezar | Qué mostrar: mensajes respondidos, tiempo de respuesta, citas agendadas, tasa de conversión, clientes atendidos. |
| 17  | **Exportación de datos**  | 🔲 Sin empezar | CSV/Excel para que el tenant pueda descargar reportes.                                                           |

---

## 📋 Checklist de Priorización

### Impacto en ventas (hacer ANTES de vender):
1. ✅ Deploy fix cooldown (#1)
2. ✅ Debounce con Redis (#2)
3. ✅ Framework prompt proactivo (#3)
4. Flujo de citas (#4) — permite cobrar
5. Catálogo de servicios (#5) — el bot necesita saber qué vende

### Impacto en retención (hacer DESPUÉS de tener clientes):

5. Recordatorios (#6)
6. Follow-ups (#14)
7. Métricas (#16)

### Impacto técnico (hacer cuando haya tiempo):

8. Debounce (#12)
9. Transcripción de audio (#11)
10. Anti-alucinaciones (#10)
11. Estructurar prompts (#9)

---

## 🔧 Notas Técnicas

- **Cooldown fix**: Ya implementado en `handler.py`. Usa `connection.extra_data["admin_chat_cooldowns"]` con JIDs normalizados. Pendiente commit + push + deploy.
- **Mensajes interactivos**: Requiere agregar `sendButtons()`, `sendList()`, `sendCTA()` al `EvolutionAdapter`. Evolution API v2 soporta estos endpoints nativamente.
- **Google Calendar**: Requiere OAuth 2.0 con scopes `calendar.events` y `calendar.readonly`. Token se guarda cifrado en BD.
- **Debounce**: Se puede implementar con Redis + delay de 3-5s antes de procesar. Ya tienes Redis en el stack.
