# Tasks: plan-differentiation (diferenciación de planes)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1200 total (6 slices, ~80–300 c/u) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 6 stacked PRs (abajo) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Límites consumibles | PR 1 | limits + schemas + tests |
| 2 | Message origin | PR 2 | model + migration + handler |
| 3 | Usage endpoint | PR 3 | plans.py + router + tests |
| 4 | Widget dashboard | PR 4 | types/api/hook/widget/page + tests (4b: pricing si >400) |
| 5 | Pricing + landing | PR 5 | plan-card, payment-screen, site.ts + tests |
| 6 | Docs + archive | PR 6 | plan-de-negocio.md |

## Phase 1: Foundation (Backend)

- [x] 1.1 `plans/capabilities.py`: docstring redefine `max_conversations_per_month` = resp. IA/mes
- [x] 1.2 `plans/schemas.py` (new): `PlanLimits`, `PlanUsage`, `PlanUsageResponse`
- [x] 1.3 `conversations/models.py`: columna `origin: String(20)` nullable (patrón `direction`)
- [x] 1.4 Migración Alembic `e3f4a5b6c7d8_add_message_origin.py` (nullable, head `e3f4a5b6c7d8` — nuevo single head sobre `f1a2b3c4d5e6`)
- [x] 1.5 Tests RED: `test_plan_capabilities.py` (límites + fallback) + foundations `test_plan_usage.py` / `test_message_origin.py` + `test_migrations_empty_upgrade.py` (HEAD_REVISION → `e3f4a5b6c7d8`)

## Phase 2: Core (Handler + Endpoint)

- [x] 2.1 handler.py L841 (FAQ) → `"programmed"`; L949 (escalación) → `"escalation"`
- [x] 2.2 handler.py L1030 (LLM) → `"ai"`; L702 (pago) sin `origin`
- [x] 2.3 Tests RED→GREEN: `test_message_origin.py` (3 caminos; inbound/admin/histórico NULL)
- [x] 2.4 `api/v1/plans.py` (new): `GET /plans/usage` — COUNT IA mes + Σ products + COUNT UserTenant; tenant JWT; 404 sin tenant; enterprise `pct=null`
- [x] 2.5 `api/v1/router.py`: include `plans_router` con admin_deps
- [x] 2.6 Tests: `test_plan_usage.py` (1200/5000/pct=24; 5100/102 soft; aislamiento; 401; no-IA; downgrade)

## Phase 3: Widget Dashboard

- [x] 3.1 `lib/types/plan.ts` (new): tipo `PlanUsage`
- [x] 3.2 `lib/api.ts`: `getPlanUsage()`
- [x] 3.3 `hooks/use-plan-usage.ts` (new): fetch por `current_tenant_id`, refetch al switch
- [x] 3.4 `plan-usage-widget.tsx` (new): barra `pct`; CTA ≥80%; exceso >100%; enterprise sin barra; error → oculto
- [x] 3.5 `dashboard/page.tsx`: widget tras "Plan Actual" (ClientDashboard)
- [x] 3.6 Tests: `plan-usage-widget.test.tsx` (24% sin CTA; 105% CTA; switch; error graceful)

## Phase 4: Pricing + Landing

- [x] 4.1 `lib/plans.ts`: `PRICE_LABELS` "Desde $390K/$790K/$1.590K/mes + IVA" (copy)
- [x] 4.2 `plan-card.tsx`: `price:number` → `priceLabel:string`; quitar `formatPrice`; card Corporativo "A cotizar" (sin Activar)
- [x] 4.3 `confirm-payment-dialog.tsx`: PRICE_OPTIONS → labels Escenario A
- [x] 4.4 `payment-screen.tsx`: sin Corporativo en QR (PLAN_QR_MAP intacto)
- [x] 4.5 `data/site.ts`: precios; "Acceso cliente" → "Solo lectura"; `planInfo` sin IA en Básico; `trialInfo` programado
- [x] 4.6 Tests: ext. `plan-card.test.ts` + `plans.test.ts` + `payment-screen.test.ts` + `confirm-payment-dialog.test.ts`; nuevo test `site.ts`

## Phase 5: Docs + Verificación

- [x] 5.1 `docs/strategy/plan-de-negocio.md`: Escenario A + Corporativo "A cotizar" (manual)
- [x] 5.2 Suite pytest + Vitest verde; grep sin <$390K ni omitir "+ IVA"; `SUPPORTED_PLANS`/regex/`CAP_AI` intactos