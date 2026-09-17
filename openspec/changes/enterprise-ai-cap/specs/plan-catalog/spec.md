# Delta for Plan Catalog

Change `enterprise-ai-cap`: el copy de "Respuestas con IA" de Empresarial pasa de "Ilimitadas" a un cupo de 100.000 respuestas IA/mes, coherente con el backend (`capabilities.py`). Copy en tuteo, honestidad (sin prometer ilimitado), estilo "~" (÷4) ya usado en Básico/Profesional (ead9cca).

## ADDED Requirements

### Requirement: EnterpriseAICapCopy

Las superficies de copy MUST decir exactamente **"Hasta 100.000 respuestas con IA al mes"** para Empresarial: `PLAN_AI_CAPS.enterprise` (`lib/plans.ts:26`), feature del package Empresarial (`data/site.ts:193`, hereda de `PLAN_AI_CAPS`), card del dashboard (`plan-card.tsx:49`) y banner del dashboard (`app/dashboard/page.tsx:534`). La fila comparativa "Respuestas con IA al mes" (`data/site.ts:211`) MUST mostrar **"100.000 (~25.000 conversaciones)"** (÷4, estilo "~" como Básico/Profesional). `planInfo.enterprise.maxConversations` (`data/site.ts:252`) MUST ser `100000` (no `null`). MUST NOT quedar copy de "respuestas con IA ilimitadas" para enterprise en landing ni dashboard. La nota `CONVERSATION_ESTIMATE_NOTE` (`lib/plans.ts:40-41`, working tree: "~4 respuestas por conversación") MUST mantenerse tal cual.
(Previously: enterprise `PLAN_AI_CAPS` = "Respuestas con IA ilimitadas", fila comparativa "Ilimitadas", `planInfo.maxConversations` = null)

#### Scenario: EnterpriseCapWordingEverywhere

- GIVEN las superficies de copy de Empresarial (PLAN_AI_CAPS, package `site.ts`, `plan-card.tsx`, banner `page.tsx`)
- WHEN se leen/renderizan
- THEN todas contienen "Hasta 100.000 respuestas con IA al mes"
- AND ninguna contiene "ilimitadas" referido a respuestas IA

#### Scenario: ComparisonRowShowsEstimate

- GIVEN la fila "Respuestas con IA al mes" de `sitePlans.comparisonRows`
- WHEN se lee la celda enterprise
- THEN es "100.000 (~25.000 conversaciones)" (÷4, con "~")

#### Scenario: PlanInfoNumericCap

- GIVEN `sitePlans.planInfo.enterprise`
- WHEN se lee `maxConversations`
- THEN es `100000` (no `null`); `maxProducts` y `maxBusinesses` siguen `null`

#### Scenario: NoUnlimitedAiCopyRemains

- GIVEN todo el copy de dashboard/landing (site.ts, plan-card.tsx, page.tsx, lib/plans.ts)
- WHEN se auditan los strings de respuestas IA
- THEN no queda "respuestas con IA ilimitadas" ni "Ilimitadas" en la fila de IA para enterprise

## Acceptance Criteria

| Criterio | Test |
|---|---|
| Copy "Hasta 100.000 respuestas con IA al mes" en las 4 superficies + fila comparativa | `data/__tests__/site.test.ts:51`, `components/__tests__/plan-card.test.ts` (extender pin), `client-dashboard-plan-usage.test.tsx` (pin enterprise capped) |
| `planInfo.enterprise.maxConversations == 100000` | `data/__tests__/site.test.ts` |
| Nota estimación alineada al working tree ("~4 respuestas por conversación") | `data/__tests__/site.test.ts:52` (hoy RED → verde) |