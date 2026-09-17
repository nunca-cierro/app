# Backend AI Cap Enforcement Specification

## Purpose

Cupo de uso justo (fair-use) de IA para el plan Empresarial en el backend: `max_conversations_per_month` pasa de `None` (ilimitado) a `100000` en `capabilities.py`. Sin mecanismo nuevo de enforcement — el gate soft plan-agnóstico del handler (`handler.py:976`) y el degrade a FAQ programada (`handler.py:985-1070`) ya existen y se activan para enterprise automáticamente. Sin bypass para superadmin (consistente con el gate actual, que lee el plan del tenant, no el rol). Spec completo — no existe spec previa.

## Requirements

### Requirement: EnterpriseAILimit

El sistema MUST exponer `max_conversations_per_month = 100000` para el plan `enterprise` vía `get_plan_limits()`. `max_agents`, `max_products` y `max_businesses` de enterprise MUST permanecer `None` (ilimitados). Los docstrings/comentarios de `capabilities.py` (:15 módulo, :81 sección de límites) MUST reflejar que el cupo de IA de enterprise es 100.000 respuestas/mes, manteniendo "None = unlimited" solo para los otros tres campos.

#### Scenario: EnterpriseLimitsCapped

- GIVEN el plan `enterprise`
- WHEN se consulta `get_plan_limits("enterprise")`
- THEN `max_conversations_per_month == 100000`

#### Scenario: OtherEnterpriseLimitsStayUnlimited

- GIVEN el plan `enterprise`
- WHEN se consultan los límites
- THEN `max_agents`, `max_products` y `max_businesses` siguen `None`

### Requirement: SoftCapActivationForEnterprise

El gate soft del handler MUST activarse para tenants enterprise: al alcanzar 100.000 respuestas IA en el mes, el siguiente mensaje entrante MUST responderse por el camino programado (FAQ/keywords/escalación/default), persistido con `origin != "ai"` (`programmed` o `escalation`), sin llamar al LLM y sin excepción. Bajo el cupo, el flujo IA normal MUST continuar. El gate MUST aplicar a todos los usuarios del tenant enterprise, incluido superadmin (sin bypass).

#### Scenario: BelowCapAiStillWorks

- GIVEN tenant `enterprise` con 99.999 respuestas IA este mes
- WHEN llega un mensaje entrante
- THEN el handler responde vía LLM y persiste `origin="ai"`

#### Scenario: AtCapDegradesToProgrammed

- GIVEN tenant `enterprise` con 100.000 respuestas IA este mes
- WHEN llega un mensaje entrante
- THEN responde por FAQ/programada (o escalación) con `origin="programmed"`, sin llamada al LLM, sin crash

#### Scenario: NoSuperadminBypass

- GIVEN usuario superadmin en un tenant `enterprise` con el cupo agotado
- WHEN llega un mensaje entrante
- THEN aplica el mismo degrade a programada (el gate lee el plan del tenant)

### Requirement: HandlerCommentAccuracy

El comentario de `handler.py:973` ("None cap (enterprise) = unlimited") MUST reemplazarse por uno que describa el cupo de 100.000 respuestas IA/mes de enterprise con degrade soft a programadas al agotarse.

#### Scenario: CommentReflectsCappedEnterprise

- GIVEN `handler.py` sección 5c (soft AI cap)
- WHEN se lee el comentario junto al gate
- THEN describe enterprise con cupo 100.000 y fallback a programadas (no "unlimited")

## Acceptance Criteria

| Criterio | Test |
|---|---|
| Enterprise AI cap 100000; otros límites None | `test_plan_capabilities.py:201-208`, `test_plan_usage.py:40-44` |
| 99.999 → flujo IA; 100.000 → programmed (`origin != "ai"`), sin crash | `test_message_origin.py` / `test_programmed_responses.py` — extender fixture `reach_ai_cap` a plan `enterprise` |
| Comentario `handler.py:973` y docstrings `capabilities.py` actualizados | revisión manual / grep (no unit test) |
| `GET /plans/usage` enterprise → límite 100000, pct numérico | `test_plan_usage.py:395-417` |