# Delta for Plan Usage Metering

Change `enterprise-ai-cap`: enterprise pasa de cupo IA ilimitado (`None`) a 100.000 respuestas IA/mes (soft). El medidor y el widget pasan a reportar `pct` numérico y barra para enterprise; el CTA "Mejorar plan" desaparece en el plan top. La tabla de límites se re-sincroniza con `capabilities.py` (drift pre-existente, mitigación declarada en el proposal).

## MODIFIED Requirements

### Requirement: EffectivePlanLimits

El sistema MUST exponer límites reales vía `get_plan_limits()` y consumirlos en el endpoint de uso. `max_conversations_per_month` se redefine como respuestas IA por tenant por mes. Planes desconocidos o `None` → defaults de `basic`. Enterprise MUST tener cupo de IA de 100.000/mes; sus demás límites (`max_agents`, `max_products`, `max_businesses`) MUST seguir siendo `None` (ilimitados).
(Previously: enterprise `max_conversations_per_month` = `None` (ilimitado); tabla además desactualizada vs código en trial/basic/professional)

| Plan | max_agents | max_products | max_conversations_per_month | max_businesses |
|---|---|---|---|---|
| trial | 1 | 25 | 500 | 1 |
| basic | 1 | 50 | 2000 | 1 |
| professional | 10 | 200 | 10000 | 5 |
| enterprise | ∞ | ∞ | 100.000 | ∞ |

#### Scenario: LimitsByKnownPlan

- GIVEN un plan soportado (`professional`)
- WHEN se consultan sus límites
- THEN agents=10, products=200, conv=10000, businesses=5

#### Scenario: UnknownPlanFallsBackToBasic

- GIVEN un plan desconocido o `None`
- WHEN se consultan sus límites
- THEN se devuelven los límites de `basic`

#### Scenario: EnterpriseAICapCapped

- GIVEN el plan `enterprise`
- WHEN se consultan sus límites
- THEN `max_conversations_per_month` == 100000
- AND `max_agents`, `max_products`, `max_businesses` son `None`

### Requirement: UsageEndpoint

El sistema MUST exponer `GET /plans/usage` (autenticado, tenant activo), solo lectura: `{plan, limits, usage, pct, over_limit}`. `usage.ai_responses` = COUNT de outbounds `origin="ai"` del mes por tenant; `usage.products` = Σ `products_services` de los agentes del tenant; `usage.businesses` = negocios del usuario. `pct` = uso/límite; `over_limit=true` si algún valor excede. Para enterprise el cupo es 100.000 → `pct` MUST ser numérico (no null); `pct` null solo cuando el límite es `None` o 0.
(Previously: "Enterprise → pct no aplicable" (null))

#### Scenario: HappyPathUsage

- GIVEN tenant `professional` con 1200 respuestas IA y 12 productos este mes
- WHEN se llama `GET /plans/usage`
- THEN `usage.ai_responses=1200`, límite 10000, `pct=12`, `over_limit=false`

#### Scenario: OverLimitSoft

- GIVEN tenant con 10100 respuestas IA (límite 10000)
- WHEN se llama el endpoint
- THEN responde `200` con `pct=101`, `over_limit=true`, sin cortar el servicio

#### Scenario: EnterpriseUsageReportsNumericCap

- GIVEN tenant `enterprise` con 60 respuestas IA este mes
- WHEN se llama `GET /plans/usage`
- THEN `limits.max_conversations_per_month` == 100000 (no null)
- AND `pct` == 0 (numérico, no null) y `over_limit=false`

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

El dashboard MUST renderizar el widget "Uso de tu plan" (barra vs límite, exceso, CTA a upgrade) del tenant activo (`current_tenant_id`). MUST NOT bloquear el dashboard ni el envío. Al cambiar de tenant MUST mostrar los contadores del tenant seleccionado. CTA SHOULD al ≥80% y MUST en exceso — salvo enterprise (plan top, sin plan superior auto-servicio): el CTA a upgrade MUST NO renderizarse para enterprise en ningún `pct`. Con el cupo enterprise numérico, el widget MUST mostrar la barra para enterprise; el estado "unlimited" (`pct` null) queda como rama defensiva (ningún plan soportado lo alcanza). Ante fallo de API, MUST degradar sin romper la página.
(Previously: enterprise (`pct` null) → estado "unlimited" sin barra; CTA plan-agnóstico a ≥80%)

#### Scenario: WidgetProgress

- GIVEN tenant con `pct=24`
- WHEN se renderiza el widget
- THEN barra al 24% sin CTA

#### Scenario: WidgetOverLimitCta

- GIVEN tenant no-enterprise con `pct=105`
- WHEN se renderiza el widget
- THEN barra en exceso con CTA a upgrade; dashboard sigue operativo

#### Scenario: EnterpriseBarWithoutUpgradeCta

- GIVEN tenant `enterprise` con `pct=90`
- WHEN se renderiza el widget
- THEN barra al 90% visible con límite "100.000"
- AND NO aparece el CTA "Mejorar plan"

#### Scenario: EnterpriseOverInformsWithoutCta

- GIVEN tenant `enterprise` con `pct=105`
- WHEN se renderiza el widget
- THEN estado de exceso informativo (sin CTA); dashboard sigue operativo

#### Scenario: TenantSwitchPreservesCounters

- GIVEN usuario con 2 tenants y widget cargado para A
- WHEN cambia al tenant B y vuelve a A
- THEN el widget muestra el uso de cada tenant

#### Scenario: WidgetApiErrorGraceful

- GIVEN fallo de `GET /plans/usage`
- WHEN se renderiza el dashboard
- THEN el widget degrada y el resto funciona

## Acceptance Criteria

| Criterio | Test |
|---|---|
| Límites consumidos y semántica resp. IA/mes | `test_plan_capabilities.py`, `test_plan_usage.py` |
| Enterprise: límite 100000, pct numérico, over_limit | `test_plan_capabilities.py:201-208`, `test_plan_usage.py:40-44`, `test_plan_usage.py:395-417` |
| `origin` en 3 caminos + migración nullable | `test_message_origin.py`, `test_programmed_responses.py` |
| Endpoint: pct, over_limit, aislamiento, 401, no-IA | `test_plan_usage.py` |
| Widget: barra, exceso, switch, error graceful | `plan-usage-widget.test.tsx` |
| Widget enterprise: barra sin CTA upgrade | `plan-usage-widget.test.tsx` (escenarios nuevos) |
| Pin enterprise capped en dashboard | `client-dashboard-plan-usage.test.tsx:175-196` |
| Migración soft no destructiva | `test_plan_usage.py` |