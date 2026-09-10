# Exploration: plan-differentiation (diferenciación de planes)

> Exploración READ-ONLY — no se modificó código. Fecha: 2026-09-10.
> Contexto: pivot mid-market B2B (sep 2026). Pricing "Escenario A" PENDIENTE de validación del owner.

## Current State

### Sistema de planes (backend)
- **Matriz de capacidades** — `nc-api/app/modules/plans/capabilities.py`:
  - 4 planes: `trial`, `basic`, `professional`, `enterprise` (L42-71).
  - `CAP_AI` solo en professional/enterprise (L55, L66) → **IA gateada desde professional**.
  - `basic`/`trial` solo tienen `dashboard.view` + `conversations.view` (L43-48).
  - `PLAN_LIMITS` definido (L74-99): `max_agents`, `max_products`, `max_conversations_per_month`, `max_businesses` — **configuración MUERTA**: `get_plan_limits()` (L122-126) no se llama en NINGÚN endpoint. No hay enforcement de ningún límite.
  - Precios explícitamente excluidos del módulo (comentario L8-9).
- **Enforcement** — `nc-api/app/modules/plans/deps.py`: `RequireCapability` (L27-76): role gate → superadmin exempt → tenant gate → plan gate (403 con mensaje de upgrade). Usado en `agents.py` (`agents_manage`, L19-21) y `platform_connections.py` (`connections_manage`, L24). Check extra de `business.edit` en PATCH /agents (agents.py L209-220).
- **Gate de IA en el handler** — `nc-api/app/modules/evolution/handler.py`:
  - L783-868: planes sin `CAP_AI` (basic/trial) → respuestas programadas por FAQ/keywords (matchers `_faq_answer_for`, `_matches_escalation_keyword` L136-189).
  - L921-976: en planes con IA, check de escalación ANTES de llamar al LLM.
  - L770-781: expiración de trial (7 días → `tenant.status = "inactive"`).
  - Mensajes outbound guardados como `Message(direction="out")` (L841-853 programado, L949-961 escalación, L1030-1042 IA). **No hay flag que distinga origen (ai/programmed/escalation)** → el medidor "conv IA del mes" no se puede calcular hoy sin marcar el origen.
- **Billing** — `nc-api/app/api/v1/billing.py`: `GET /billing/payment-info` con `qr_urls` basic/professional/enterprise + método Bre-B únicamente (L15-38). `ActivatePlanRequest` regex `^(basic|professional|enterprise)$` (`tenants/schemas.py` L122-127). `activate_tenant_plan` (`tenants/service.py` L54-85): setea plan + `payment_status=active` + `plan_activated_at` (inmutable). **Sin lógica de downgrade, sin historial de cambios de plan, sin semántica de migración**.
- **Tenant** — `tenants/models.py`: `plan` String(50) default "basic" (L27), `payment_status` (L34-36), `plan_activated_at` (L37-39). Self-service create → forzado a "basic" (`tenants.py` L61-65). PATCH de admin → `plan`/`status` descartados (L222-228). Solo superadmin puede `activate-plan` / `payment-status` (L242-277). `is_internal_tenant` exento de pago (tenants.py L136-137, auth.py L319-320, L372-373).
- **Datos para el medidor**:
  - `Conversation` (`conversations/models.py`): `tenant_id`, `created_at`/`started_at`, `status`, `extra_data` JSONB.
  - `Message` (L120-225): `tenant_id`, `direction`, `platform`, `message_type`, `status`, `created_at`. Sin flag de origen.
  - `metrics.py`: cuenta `Message` (no conversaciones). No hay endpoint de uso por plan.
  - **Productos NO son modelo**: viven en `agent.business_config["products_services"]` JSONB (`agents/utils.py` L67-82, `templates.py` L91+). Conteo = `len(products_services)` por agente.
  - **Negocios** = filas `UserTenant` por usuario; el self-service ya impide crear 2º negocio (solo usuarios tenantless, `tenants.py` L56-57) → límite de 1 negocio implícito hoy.

### Frontend
- `lib/plans.ts`: `PLAN_LABELS` (trial/basic/professional/enterprise) + test.
- `lib/capabilities.ts`: fallback espejo del backend — basic/trial → view-only (L43-57).
- `app/dashboard/components/plan-card.tsx`: `PLANS_CONFIG` con **precios STALE $60K/$120K/$250K** (L11-46) + `formatPrice` (L48-50).
- `app/dashboard/components/payment-screen.tsx`: `PLAN_QR_MAP` (L16-20) + QR + Bre-B + comprobante por WhatsApp.
- `app/dashboard/components/expired-trial-overlay.tsx`: plan cards → payment screen (3 cards, sin Corporativo).
- `app/dashboard/page.tsx`: badge de plan + cajas de features por plan (L473-532), banner pago pendiente (L456-471). **Aquí entra el widget "Uso de tu plan"**.
- `data/site.ts` `sitePlans`: `comparisonRows` (L193-202) — la fila "Acceso cliente: Empresarial = Editar + agregar" (L200) **es FALSA** vs código (client es solo-lectura en cualquier plan); `planInfo` (L204-245) duplica límites y promete `model: gpt-4o-mini`. La landing `/whatsapp` NO muestra precios.
- `data/landing/pricing.ts`: precios one-time de sitios web ($699.900/$999.000/$1.799.000) — producto distinto (landing `/inicio`), NO tocar aquí.

### Docs y memoria
- `docs/strategy/plan-de-negocio.md`: tabla de precios **STALE** $60K/$120K/$250K (L18-23).
- **`templates.py` L304-367 (plantilla interna NuncaCierro) YA codifica Escenario A**: "Desde $390.000/mes + IVA", "$790.000", "$1.590.000", Corporativo "A cotizar (~$3.500.000)", anti-undercut $390K, e incluso "IA conversacional desde el plan inicial" (L319) — el bot de ventas ya promete lo que el código aún no hace.
- Memoria Engram: #640 (decisión: tiers fijos primero, metering fase 2; widget informativo "Uso de tu plan" con alerta 80% suave, histórico 6 meses; NUNCA cortar/bloquear en v1; piso anti-micro $390K; nunca "créditos"), #1052/#1057 (auditoría + benchmark; Escenario A recomendado; IA desde Básico; Básico self-serve).

### Tests existentes
- `nc-api/tests/test_plan_capabilities.py` (609 líneas): matriz + gates + self-upgrade guard. **`test_basic_and_trial_lack_ai_and_management` (L91-95) se rompe al dar IA a Básico**.
- `nc-api/tests/test_billing.py`, `test_payment_status_*.py`.
- `nc-api/tests/test_programmed_responses.py`: valida FAQ en basic/trial — **se rompe si basic pasa a IA**.
- Dashboard: `capabilities.test.ts`, `plans.test.ts`, `payment-screen.test.ts`.

## Gaps (qué debe cambiar)

1. **IA desde Básico**: mover `CAP_AI` a basic (trial probablemente se queda en FAQ — confirmar). Invierte la rama 5c del handler, el fallback del frontend, las cajas de features del dashboard y 2+ suites de tests.
2. **Corporativo**: no existe como plan. Opciones: etiqueta de marketing mapeada a enterprise (sin self-serve) vs enum real `corporate`. Afecta `SUPPORTED_PLANS`, regex de `ActivatePlanRequest`, `PLAN_LABELS`, QR map.
3. **Precios Escenario A (PENDIENTE validación)**: `plan-card.tsx` $60K/$120K/$250K stale; framing "Desde" + "+ IVA"; estrategia doc stale.
4. **Límites**: `PLAN_LIMITS` muerto. v1 = **informativo**: exponer límites + uso calculado, NO enforcement.
5. **Medidor de uso**: necesita (a) definir "conversaciones IA del mes" — hoy no hay flag de origen en `Message`; (b) endpoint que compute uso (productos, conversaciones, negocios) — no requiere tabla nueva en v1.
6. **Migración de tenants**: `activate_tenant_plan` cambia el plan sin semántica de downgrade. Obs #640: sin cortes destructivos en v1. Decidir: soft (informativo) — el medidor muestra exceso, no se borra nada.
7. **FAQ-degradation**: qué pasa al llegar al límite: obs #640 rechaza degradar IA→FAQ ("daña a los clientes del cliente"); v1 = seguir sirviendo + medidor en exceso + CTA a upgrade.

## Approaches

### 1. **Plan config + endpoint de uso + widget informativo** (recomendado)
   Backend: `CAP_AI` a basic en `capabilities.py`; nuevo endpoint `GET /plans/usage` (o extender `/auth/me`) que computa uso real (productos = `len(products_services)` por agente; conversaciones IA del mes = conversations con ≥1 outbound marcado; negocios = conteo UserTenant) y devuelve `{plan, limits, usage, pct, alert80}`. Marcar origen en los 3 caminos de outbound del handler (ai/programmed/escalation). Frontend: widget "Uso de tu plan" en el card del dashboard, precios Escenario A en `plan-card.tsx`/`lib/plans.ts`, landing con "Desde + IVA" + card Corporativo gated.
   - Pros: cumple los 7 objetivos del goal; cero riesgo de billing (nada se cobra/bloquea); el medidor usa datos que ya existen; el flag de origen habilita el metering futuro (fase 2); TDD natural.
   - Cons: toca backend+frontend; requiere decisión de definición de métrica; el endpoint de uso hace 3-4 COUNTs por tenant (aceptable a esta escala).
   - Effort: **Medium-High** (pero troceable en PRs: capabilities → handler flag → endpoint → widget → landing).

### 2. **Enforcement total + metering** (rechazado para v1)
   `require_limit` dependency, 403/429 al exceder, tabla de contadores, jobs mensuales.
   - Pros: "límites reales".
   - Cons: contradice la decisión #640 (v1 informativo, pago manual QR no soporta cobrar excesos); costo alto; rompe la confianza en el momento de compra del pivot.
   - Effort: **High**.

### 3. **Marketing-only** (insuficiente)
   Solo precios + landing + card Corporativo, sin tocar capabilities ni handler.
   - Pros: mínimo esfuerzo.
   - Cons: NO cumple los objetivos 2 (IA desde Básico), 3 (medidor), 4 (límites) — son backend. El bot de ventas (templates.py) ya promete IA desde Básico y el código no la da.
   - Effort: **Low**.

## Recommendation

**Approach 1**, con scope v1 explícito: diferenciación informativa (IA desde Básico + límites expuestos + medidor "Uso de tu plan" + precios Escenario A + Corporativo gated), SIN enforcement ni cobro. El flag de origen en `Message` es el habilitador barato del metering de fase 2. La migración de tenants queda soft (sin borrado) y documentada.

Secuencia sugerida de trabajo (slices): (1) capabilities + tests; (2) handler (gate flip + flag origen) + tests; (3) endpoint de uso + tests; (4) widget dashboard + precios frontend + landing + tests; (5) doc estratégico + archive.

**Decisiones que necesita el owner ANTES de proposal**:
- Validar Escenario A ($390K/$790K/$1.590K + Corporativo ~$3.5M, framing "Desde" + "+ IVA").
- ¿Trial conserva FAQ (sin IA) o también recibe IA? (recomendado: trial sin IA).
- ¿Qué pasa al 100% del límite? (recomendado: seguir sirviendo, medidor en exceso + CTA upgrade; sin degradar a FAQ).
- ¿"Corporativo" = etiqueta de marketing sobre enterprise o enum real? (recomendado: etiqueta marketing para v1).
- Definición de "conversaciones IA del mes" (recomendado: conversaciones con ≥1 respuesta outbound de origen IA en el mes, con el nuevo flag).

## Risks

- **Precios stale en 4 lugares** (plan-card.tsx, site.ts, plan-de-negocio.md, templates.py) — riesgo de inconsistencia si no se actualizan juntos; `templates.py` ya está en Escenario A y el resto no.
- **Tests que se rompen**: `test_plan_capabilities.py` (basic lacks AI), `test_programmed_responses.py` (basic programado), `capabilities.test.ts` (fallback) — hay que actualizarlos en el mismo slice que el cambio de capabilities.
- **Flag de origen**: si no se agrega, el medidor queda aproximado (todas las conversaciones del mes) y el metering de fase 2 tendrá que migrar datos.
- **Definición de métrica**: "conversaciones/mes" puede interpretarse como conversaciones iniciadas vs atendidas por IA; la elección cambia los números que ve el cliente.
- **Corporativo sin plan**: si se añade como enum, `SUPPORTED_PLANS`/regex/QR/fallback se tocan en cadena; si es solo marketing, el flujo de pago no debe ofrecerlo (gated).
- **Dashboard promete cosas falsas**: fila "Acceso cliente: Empresarial Editar+agregar" (site.ts L200) es falsa; corregir en el mismo cambio para no perpetuar el desajuste.

## Ready for Proposal

**Sí**, con la condición de que el owner valide primero: Escenario A, trial sin IA, comportamiento al 100%, naturaleza de Corporativo, y la definición de "conversación IA del mes". Esas 5 decisiones condicionan el spec.