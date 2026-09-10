# Plan Usage Metering Specification

## Purpose

Medición informativa del consumo por tenant: límites efectivos, flag de origen en mensajes outbound, endpoint `GET /plans/usage` y widget de dashboard. Sin enforcement ni auto-cobro. Spec completo — no existe spec previa.

## Requirements

### Requirement: EffectivePlanLimits

El sistema MUST exponer límites reales vía `get_plan_limits()` y consumirlos en el endpoint de uso. `max_conversations_per_month` se redefine como respuestas IA por tenant por mes. Planes desconocidos o `None` → defaults de `basic`.

| Plan | max_agents | max_products | max_conversations_per_month | max_businesses |
|---|---|---|---|---|
| trial | 1 | 10 | 100 | 1 |
| basic | 1 | 10 | 500 | 1 |
| professional | 5 | 50 | 5000 | 3 |
| enterprise | ∞ | ∞ | ∞ | ∞ |

#### Scenario: LimitsByKnownPlan

- GIVEN un plan soportado (`professional`)
- WHEN se consultan sus límites
- THEN agents=5, products=50, conv=5000, businesses=3

#### Scenario: UnknownPlanFallsBackToBasic

- GIVEN un plan desconocido o `None`
- WHEN se consultan sus límites
- THEN se devuelven los límites de `basic`

### Requirement: MessageOriginTagging

El sistema MUST persistir `Message.origin` (nullable) en cada respuesta outbound: `ai` (LLM), `programmed` (FAQ/keywords), `escalation` (fallback). Los tres caminos outbound del handler MUST setearlo. Inbound e históricos quedan `NULL` y NO se cuentan como IA.

#### Scenario: AiOriginTagged

- GIVEN tenant con `CAP_AI` y mensaje entrante sin escalación
- WHEN el handler responde vía LLM
- THEN el outbound se persiste con `origin="ai"`

#### Scenario: ProgrammedOriginTagged

- GIVEN tenant trial/basic sin `CAP_AI`
- WHEN el handler responde vía FAQ/keywords
- THEN el outbound se persiste con `origin="programmed"`

#### Scenario: EscalationOriginTagged

- GIVEN mensaje que matchea keywords de escalación
- WHEN el handler envía el fallback
- THEN el outbound se persiste con `origin="escalation"`

#### Scenario: HistoricalMessagesNull

- GIVEN mensajes previos a la migración
- WHEN se aplica la columna nullable
- THEN `origin` queda `NULL` y no se cuenta como IA

### Requirement: UsageEndpoint

El sistema MUST exponer `GET /plans/usage` (autenticado, tenant activo), solo lectura: `{plan, limits, usage, pct, over_limit}`. `usage.ai_responses` = COUNT de outbounds `origin="ai"` del mes por tenant; `usage.products` = Σ `products_services` de los agentes del tenant; `usage.businesses` = negocios del usuario. `pct` = uso/límite; `over_limit=true` si algún valor excede. Enterprise → `pct` no aplicable.

#### Scenario: HappyPathUsage

- GIVEN tenant `professional` con 1200 respuestas IA y 12 productos este mes
- WHEN se llama `GET /plans/usage`
- THEN `usage.ai_responses=1200`, límite 5000, `pct=24`, `over_limit=false`

#### Scenario: OverLimitSoft

- GIVEN tenant con 5100 respuestas IA (límite 5000)
- WHEN se llama el endpoint
- THEN responde `200` con `pct=102`, `over_limit=true`, sin cortar el servicio

#### Scenario: TenantIsolation

- GIVEN usuario admin con 2 tenants
- WHEN consulta con tenant activo A
- THEN solo se cuentan datos del tenant A

#### Scenario: UnauthenticatedRejected

- GIVEN petición sin token válido
- WHEN se llama el endpoint
- THEN responde `401`

#### Scenario: NonAiNotCounted

- GIVEN outbounds con `origin="programmed"` o `"escalation"` este mes
- WHEN se computa el uso
- THEN no incrementan `ai_responses`

### Requirement: UsageWidget

El dashboard MUST renderizar el widget "Uso de tu plan" (barra vs límite, exceso, CTA a upgrade) del tenant activo (`current_tenant_id`). MUST NOT bloquear el dashboard ni el envío. Al cambiar de tenant MUST mostrar los contadores del tenant seleccionado. CTA SHOULD al ≥80% y MUST en exceso. Ante fallo de API, MUST degradar sin romper la página.

#### Scenario: WidgetProgress

- GIVEN tenant con `pct=24`
- WHEN se renderiza el widget
- THEN barra al 24% sin CTA

#### Scenario: WidgetOverLimitCta

- GIVEN tenant con `pct=105`
- WHEN se renderiza el widget
- THEN barra en exceso con CTA a upgrade; dashboard sigue operativo

#### Scenario: TenantSwitchPreservesCounters

- GIVEN usuario con 2 tenants y widget cargado para A
- WHEN cambia al tenant B y vuelve a A
- THEN el widget muestra el uso de cada tenant

#### Scenario: WidgetApiErrorGraceful

- GIVEN fallo de `GET /plans/usage`
- WHEN se renderiza el dashboard
- THEN el widget degrada y el resto funciona

### Requirement: SoftPlanMigration

El sistema MUST preservar datos al cambiar de plan (upgrade/downgrade): sin borrar mensajes, agentes, productos ni negocios; el medidor MUST reflejar el exceso. Sin auto-cobro ni corte (pago manual QR).

#### Scenario: DowngradePreservesData

- GIVEN tenant `professional` con 3000 respuestas IA que baja a `basic` (límite 500)
- WHEN se activa el nuevo plan
- THEN los datos persisten y el widget muestra `over_limit=true` con CTA

## Acceptance Criteria

| Criterio | Test |
|---|---|
| Límites consumidos y semántica resp. IA/mes | `test_plan_capabilities.py`, `test_plan_usage.py` |
| `origin` en 3 caminos + migración nullable | `test_message_origin.py`, `test_programmed_responses.py` |
| Endpoint: pct, over_limit, aislamiento, 401, no-IA | `test_plan_usage.py` |
| Widget: barra, exceso, switch, error graceful | `plan-usage-widget.test.tsx` |
| Migración soft no destructiva | `test_plan_usage.py` |