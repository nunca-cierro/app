# Verification Report — plan-differentiation

**Change**: plan-differentiation
**Version**: N/A (specs `plan-usage-metering` + `plan-catalog`, ambos completos)
**Mode**: Strict TDD
**Date**: 2026-09-10
**Executed by**: sdd-verify executor (deepseek-v4-flash)
**Commits**: `424952a`..`4c76902` (5 slices, stacked-to-main, sin push — HEAD `4c76902`)

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 25 |
| Tasks complete | 25 |
| Tasks incomplete | 0 |

`tasks.md` Phases 1-5 todas `[x]`. ✅

## Build & Tests Execution (ejecutado en esta verificación, no copiado del apply)

**Build**: ✅ Passed — `npx tsc --noEmit` → exit 0 (nc-dashboard).

**Tests**:
```text
# nc-api — uv run pytest -q
705 passed in 112.94s (0:01:52)

# nc-dashboard — npx vitest run
Test Files  50 passed (50)
     Tests  389 passed (389)
Duration 10.71s

# nc-dashboard — npx tsc --noEmit
TSC_EXIT_0
```

**Coverage**: ➖ No coverage tool detected (sin `pytest-cov` en nc-api/pyproject.toml, sin config `coverage` en vitest/vite config de nc-dashboard). Informational — no es fallo.

**Migration head**: ✅ SINGLE — `alembic heads` → `e3f4a5b6c7d8 (head)`; historia lineal, sin heads paralelos. `down_revision='f1a2b3c4d5e6'`.

## Spec Compliance Matrix — plan-usage-metering

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| EffectivePlanLimits | LimitsByKnownPlan | `test_plan_capabilities.py::TestPlanLimits::test_professional_limits` (5/50/5000/3) | ✅ COMPLIANT |
| EffectivePlanLimits | UnknownPlanFallsBackToBasic | `test_plan_capabilities.py` (unknown + None → basic); `test_plan_usage.py::test_unknown_plan_falls_back_to_basic_limits` (endpoint) | ✅ COMPLIANT |
| MessageOriginTagging | AiOriginTagged | `test_message_origin.py::TestOriginHandlerPaths::test_llm_outbound_tagged` (handler L1032-1044 `origin="ai"`) | ✅ COMPLIANT |
| MessageOriginTagging | ProgrammedOriginTagged | `test_message_origin.py::test_faq_programmed_outbound_tagged_inbound_null` (L841-853 `origin="programmed"`) | ✅ COMPLIANT |
| MessageOriginTagging | EscalationOriginTagged | `test_message_origin.py::test_escalation_outbound_tagged` (L950-962 `origin="escalation"`) | ✅ COMPLIANT |
| MessageOriginTagging | HistoricalMessagesNull | `test_message_origin.py` (NULL persistido, sin server_default) + `test_migrations_empty_upgrade.py` (is_nullable=YES, column_default=None) | ✅ COMPLIANT |
| UsageEndpoint | HappyPathUsage | `test_plan_usage.py::test_happy_path_professional` (1200/5000/pct=24, payload completo) | ✅ COMPLIANT |
| UsageEndpoint | OverLimitSoft | `test_plan_usage.py::test_over_limit_soft_returns_200` (5100→102, 200, sin corte) | ✅ COMPLIANT |
| UsageEndpoint | TenantIsolation | `test_plan_usage.py::test_tenant_isolation_active_tenant_only` (A=300, B=700 invisible) | ✅ COMPLIANT |
| UsageEndpoint | UnauthenticatedRejected | `test_plan_usage.py::test_unauthenticated_returns_401` | ✅ COMPLIANT |
| UsageEndpoint | NonAiNotCounted | `test_plan_usage.py::test_non_ai_outbounds_not_counted` (programmed/escalation no suman) | ✅ COMPLIANT |
| UsageWidget | WidgetProgress | `plan-usage-widget.test.tsx` (24% sin CTA, aria-valuenow/width exactos) | ✅ COMPLIANT |
| UsageWidget | WidgetOverLimitCta | `plan-usage-widget.test.tsx` (105% CTA, barra clamp 100, label 105%) + integración página | ✅ COMPLIANT |
| UsageWidget | TenantSwitchPreservesCounters | Hook: solo gate puro `loadPlanUsage` + contrato render; el `useEffect` de switch/refetch NO se ejecuta en runtime (entorno SSR node sin jsdom) | ⚠️ PARTIAL |
| UsageWidget | WidgetApiErrorGraceful | `plan-usage-widget.test.tsx` (html "") + `client-dashboard-plan-usage.test.tsx` (página viva, widget oculto) | ✅ COMPLIANT |
| SoftPlanMigration | DowngradePreservesData | `test_plan_usage.py::test_downgrade_preserves_data_and_reflects_excess` (3000→basic, pct=600, over=true) | ✅ COMPLIANT |

**Compliance summary**: 15/16 COMPLIANT, 1 PARTIAL (TenantSwitchPreservesCounters).

## Spec Compliance Matrix — plan-catalog

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| ScenarioAPricing | BasicPriceDisplay | `plans.test.ts` + `plan-card.test.ts` (exacto "Desde $390.000/mes + IVA") | ✅ COMPLIANT |
| ScenarioAPricing | ProfessionalAndEnterpriseDisplay | `plans.test.ts` ($790.000 / $1.590.000) | ✅ COMPLIANT |
| ScenarioAPricing | NoUndercutFloor | `site.test.ts` (regex `/\$(\d[\d.]*)/` floor ≥390000) + grep anti-undercut (abajo) | ✅ COMPLIANT |
| CorporateMarketingCard | CorporateCardVisibleGated | `plan-card.test.ts` ("A cotizar", CTA "Cotizar", sin "Activar", quoteUrl wa.me) | ✅ COMPLIANT |
| CorporateMarketingCard | CorporateNotInPaymentFlow | `payment-screen.test.ts` (PLAN_QR_MAP sin corporate, resolvePlanQr→null, SSR card cotización) + `confirm-payment-dialog.test.ts` (PLAN_OPTIONS sin corporate) | ✅ COMPLIANT |
| CorporateMarketingCard | BackendPlansUntouched | Static: `SUPPORTED_PLANS = frozenset(PLAN_CAPABILITIES)` (sin corporate), regex `ActivatePlanRequest = ^(basic\|professional\|enterprise)$`, 0 hits "corporate/corporativo" en nc-api | ✅ COMPLIANT (static) |
| LandingCoherence | ClientAccessRowFixed | `site.test.ts` (enterprise = "Solo lectura", no "Editar + agregar"); site.ts L218 | ✅ COMPLIANT |
| LandingCoherence | NoAiPromiseOnBasic | `site.test.ts` (hasAI false, sin property model) + `plan-card.tsx` features "Sin acceso a IA" + `test_plan_capabilities.py` (basic/trial sin CAP_AI) | ✅ COMPLIANT |
| LandingCoherence | TrialRemainsProgrammed | `site.test.ts` (trialInfo.type="programmed", desc "respuestas programadas", sin IA) | ✅ COMPLIANT |
| PricingDocsSync | DocPricingUpdated | Revisión manual: `plan-de-negocio.md` L21-24 Escenario A + Corporativo "A cotizar (~$3.500.000/mes + IVA)"; sin $60K/$120K/$250K (grep) | ✅ COMPLIANT (manual) |

**Compliance summary**: 10/10 COMPLIANT.

## Correctness (Static Evidence)

| Item | Status | Notas |
|------|--------|-------|
| Columna `Message.origin` | ✅ Implementado | `String(20) nullable`, patrón `direction`, sin server_default (models.py L187-189; migración e3f4a5b6c7d8) |
| 3 outbounds evolution taggeados | ✅ Implementado | L841 `programmed`, L950 `escalation`, L1032 `ai`; pago L702 y admin from_me SIN tag (NULL) — exactamente 4 `Message(` en handler.py |
| Endpoint `GET /plans/usage` | ✅ Implementado | Tenant JWT-scoped; 404 "No active tenant"; COUNT origin='ai' AND direction='out' AND created_at≥mes AND tenant; Σ products (JSONB en Python); COUNT UserTenant; pct round(% IA); over_limit si CUALQUIER métrica excede; enterprise pct=None; plan desconocido→basic |
| Widget dashboard | ✅ Implementado | Tras "Plan Actual" (page.tsx L543-549, test verifica orden); <80 sin CTA / ≥80 CTA / >100 exceso / pct null "Ilimitado" / error oculto; `onUpgrade` → payment |
| Escenario A copy | ✅ Implementado | `PRICE_LABELS` fuente de verdad; dot-format "$390.000/mes + IVA" en todas las superficies SaaS (lib/plans, plan-card, site.ts packages+comparisonRows, confirm-payment-dialog) |
| Corporativo gated | ✅ Implementado | PLANS_CONFIG + site.ts packages; quoteOnly, sin QR (resolvePlanQr→null), sin PLAN_OPTIONS, CTA WhatsApp |
| site.ts fila falsa corregida | ✅ Implementado | "Acceso cliente" pro/enterprise = "Solo lectura"; planInfo sin `model` por plan; clientAccessType="read"; basic hasAI=false |
| plan-de-negocio.md | ✅ Implementado | Escenario A + Corporativo; gitignored (local-only, NO commiteado — consistente) |
| `expired-trial-overlay.tsx` | ✅ Coherente | "incluyen IVA" → "antes de IVA" (L62) — alineado con framing "+ IVA" |

## Coherence (Design)

| Decisión | ¿Seguida? | Notas |
|----------|-----------|-------|
| D1: límites consumibles; pct = % IA primaria; over_limit = any | ✅ Sí | `compute_pct` (round), `compute_over_limit` (any), tests helper + endpoint |
| D1: products = Σ len(products_services); businesses = COUNT UserTenant | ✅ Sí | plans.py L99-115 |
| D2: origin NULLABLE sin backfill ni server_default; String(20) | ✅ Sí | modelos + migración + test_migrations_empty_upgrade |
| D2: pago y admin quedan NULL | ✅ Sí | L702 sin origin; test_admin_from_me_outbound_origin_null |
| D3: tenant desde JWT; 404 sin tenant; PlanUsageResponse | ✅ Sí | plans.py + schemas.py + tests 404/401 |
| D4: priceLabel copy strings; corporate marketing-only | ✅ Sí | sin aritmética; sin fuga a pago/QR/backend |
| D5: migración soft preserva datos | ✅ Sí | test_downgrade_preserves_data_and_reflects_excess |

## Owner Decisions (validación adversaria)

| Decisión owner | ¿Sostenida? | Evidencia |
|----------------|-------------|-----------|
| Escenario A (Desde + IVA) | ✅ | PRICE_LABELS/plan-card/site.ts/dialog = "$390.000/$790.000/$1.590.000/mes + IVA" |
| Corporativo gated marketing-only | ✅ | quoteOnly + sin QR + sin PLAN_OPTIONS + sin SUPPORTED_PLANS/regex/QR map |
| Trial/basic FAQ-only; CAP_AI NO movido | ✅ | CAP_AI solo professional/enterprise (capabilities.py L55-77); tests lo fijan |
| 100% soft (sin enforcement/billing) | ✅ | Docstrings + endpoint 200 sobre límite + widget informativo; nada bloquea/cobra |
| Corporativo NO plan backend | ✅ | SUPPORTED_PLANS=frozenset(PLAN_CAPABILITIES); regex `^(basic\|professional\|enterprise)$`; 0 "corporate" en nc-api |
| Métrica = mensajes IA outbound por tenant/mes | ✅ | COUNT origin='ai' AND direction='out' AND created_at≥mes AND tenant_id |

## Anti-Undercut Grep (superficies SaaS, excluye `data/landing/pricing.ts` + `app/demo/*`)

✅ **LIMPIO** — ningún precio < $390.000 en superficies SaaS:
- `lib/plans.ts`, `app/dashboard/components/plan-card.tsx`, `data/site.ts`, `confirm-payment-dialog.tsx` → $390.000/$790.000/$1.590.000, corporate ~$3.500.000.
- `data/landing/pricing.ts` ($699.900/$999.000/$1.799.000 web one-time) y `app/demo/*` ($21.000-$259.000) → EXCLUIDOS por decisión owner (línea de producto separada / contenido demo).
- Stale $60K/$120K/$250K → solo en comentarios de tests como assertions negativas intencionales (`not.toContain("$60.000")`).
- Nota: `components/sections/hero/whatsapp-mockup.tsx` L27 muestra "$15.000" (mensaje ficticio de cliente en mockup de chat, no superficie de pricing) — ver SUGGESTION 2.

## Strict TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Tabla "TDD Cycle Evidence" en apply-progress (revisiones 1-5) |
| All tasks have tests | ✅ | 25/25; 5.1 (docs) es revisión manual — spec no exige unit test |
| RED confirmed (tests exist) | ✅ | Todos los archivos de test existen y fueron verificados por lectura |
| GREEN confirmed (tests pass) | ✅ | 705 pytest + 389 vitest pasan en ejecución fresca; tsc 0 |
| Triangulation adequate | ✅ | Múltiples casos por comportamiento (widget 24/79/80/100/105; endpoint happy/over/aislamiento/401/no-IA/downgrade/desconocido/enterprise; pct helper 0/24/102/None) |
| Safety Net | ✅ | Apply reporta suite completa previa (baseline 37/37 slice 5; 705/388/0 verificación) |

**TDD Compliance**: 6/6 checks passed.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit (puras + schemas) | pytest helpers/limites + vitest puras | test_plan_capabilities, test_plan_usage (helpers), plans.test.ts, plan-usage-widget (puras), site.test.ts | pytest / vitest |
| Integration (endpoint DB + página) | 705 pytest totales + 3 vitest página | test_plan_usage (endpoint), client-dashboard-plan-usage.test.tsx | httpx AsyncClient + DB real; react-dom/server |
| Handler-level | 4 | test_message_origin.py::TestOriginHandlerPaths | pytest + mocks adapter/LLM |
| E2E | 0 | — | no instalado (consistente con capacidades) |
| **Total** | **705 + 389** | **50 vitest files + ~54 pytest files** | |

## Assertion Quality Audit (Step 5f)

✅ **All assertions verify real behavior** — auditados: `test_plan_usage.py`, `test_message_origin.py`, `test_plan_capabilities.py`, `test_migrations_empty_upgrade.py`, `plan-usage-widget.test.tsx`, `use-plan-usage.test.ts`, `client-dashboard-plan-usage.test.tsx`, `plans.test.ts`, `payment-screen.test.ts`, `site.test.ts`, `plan-card.test.ts`. Sin tautologías, sin ghost loops, sin smoke-only, sin assertions de solo tipo sin valor. Patrón extract-before-mock (helpers puros) bien aplicado.

## Issues Found

**CRITICAL**: None.

**WARNING**:
1. **TenantSwitchPreservesCounters PARTIAL** — El `useEffect` de `use-plan-usage.ts` (L56-93: descartar contadores + refetch al cambiar `tenantId`) nunca se ejecuta en los tests: el entorno vitest es node (sin jsdom) y SSR salta efectos. El gate puro `loadPlanUsage` y el contrato render están cubiertos; el glue del switch está implementado (código inspeccionado, correcto) pero no probado en runtime. Limitación del patrón del repo, no defecto de lógica.
2. **Metering es solo canal Evolution** — `telegram/handler.py` (L265 programmed, L371 AI) e `integrations/webhook.py` (L297/310, Meta Cloud API legacy) crean outbounds de IA SIN tag `origin` → no cuentan en el medidor. Esto coincide con spec/design tal como están escritos (scope = 3 caminos del handler de evolution), pero el widget "Respuestas IA este mes" subestima para tenants con canal Telegram/legacy. Dirección segura (soft, informativo, nunca bloquea/cobra) — el owner debe confirmar intención multi-canal para un follow-up.
3. **Sales docs stale $60K/$120K/$250K** — `docs/sales/manual-de-ventas.md` L31 (resumen que CITA plan-de-negocio.md como fuente pero lo contradice) + L189-191; `conversaciones-comerciales.md` L360/377/395/483/503/571-573/643-645/664-666; `prospecting-messages.md` L53/69/79/216-219; `ads/Estrategia Facebook.md` L515/520. Todos gitignored (`docs/` en .gitignore:47), fuera de los commits del cambio. Riesgo comercial (scripts de venta con precios falsos), cero riesgo de código. El más urgente: `manual-de-ventas.md` L31. Requiere decisión owner para pasada de docs local.

**SUGGESTION**:
1. **Budgets de revisión** — commits `424952a` (411 ins) y `26a1672` (505 ins, ~370 de tests) exceden ligeramente el budget de 400 líneas/PR. Ya revisados en apply; considerar en el plan de review de PRs.
2. **`whatsapp-mockup.tsx` L27** — "$15.000" (mensaje ficticio de cliente en el hero de la landing). No es superficie de pricing, pero está fuera de la exclusión literal (`app/demo/*`). Confirmar con owner que el scope de exclusión lo cubre (es contenido demo, misma categoría).
3. **Formato spec vs copy** — las specs usan "$390K" (contrato) y el copy de código "$390.000" (formato canon, decisión documentada en apply-progress). Coherente por diseño; una nota en el spec ahorraría confusión futura.

## Verdict

**PASS WITH WARNINGS**

Todos los criterios duros se cumplen: 25/25 tasks, 705 pytest + 389 vitest + tsc 0 en ejecución fresca, head de migración único (`e3f4a5b6c7d8`), 25/26 escenarios con test pasando (1 PARTIAL por limitación del entorno de test, no por defecto de código), 10/10 del catálogo, las 6 decisiones owner sostenidas, anti-undercut limpio en superficies SaaS. Los WARNINGs (switch sin test runtime, metering solo-Evolution, docs de ventas stale gitignored) no bloquean pero requieren reconocimiento del owner antes de archive.

**Archive permitted**: ✅ SÍ — sin CRITICAL, sin escenarios FAILING/UNTESTED, suites verdes. Condición: el owner reconoce los WARNING 1-3 (especialmente el alcance del metering multi-canal y la pasada pendiente de docs de ventas).