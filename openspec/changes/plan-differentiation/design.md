# Design: plan-differentiation (diferenciación de planes)

## Technical Approach

Cambio aditivo e informativo, sin enforcement ni cobro. Backend: columna nullable `origin` en `Message` + migración, seteada en los 3 outbounds del handler; `get_plan_limits()` (hoy muerta) se consume en `GET /api/v1/plans/usage` con COUNTs por tenant. Frontend: widget "Uso de tu plan" (barra + CTA) según tenant activo, precios Escenario A (copy strings) y card Corporativo marketing-only. Sin tocar `SUPPORTED_PLANS`, regex de `ActivatePlanRequest`, QR ni `CAP_AI`. Mapea a `plan-usage-metering` y `plan-catalog`.

## Architecture Decisions

### D1: Límites consumibles y métrica
| Opción | Tradeoff | Decisión |
|---|---|---|
| Contadores + job mensual | exacta, fase 2 | COUNT SQL directo en el endpoint |
| Conversation-level | no refleja volumen | Message-level: `origin='ai' AND direction='out' AND created_at >= mes AND tenant_id=X` |
| `pct` por métrica | complejidad UI | `pct` = % respuestas IA; `over_limit` = true si CUALQUIER métrica excede |

`max_conversations_per_month` = respuestas IA/mes (valores intactos); desconocido → básico. `usage.products` = Σ `len(products_services)` de agentes del tenant (JSONB, en Python); `usage.businesses` = COUNT(UserTenant del usuario).

### D2: Columna `origin`
| Opción | Tradeoff | Decisión |
|---|---|---|
| NOT NULL + backfill | destructiva | NULLABLE, sin backfill, sin server_default |
| Enum PostgreSQL | rigidez | `String(20)` (patrón `direction`) |

FAQ (L841) → `programmed`; escalación (L949) → `escalation`; LLM (L1030) → `ai`. Payment path y admin `from_me` quedan NULL (no son respuestas de tenant).

### D3: Endpoint y aislamiento
| Opción | Tradeoff | Decisión |
|---|---|---|
| Parámetro `tenant_id` | fuga cross-tenant | Tenant desde JWT (`current_tenant_id`) |
| Superadmin sin tenant | plan indefinido | `404 "No active tenant"` (widget solo en client) |
| Sin response_model | contrato débil | `PlanUsageResponse` en `plans/schemas.py` |

COUNTs indexados por `tenant_id`, sin cache v1.

### D4: Precios y Corporativo
| Opción | Tradeoff | Decisión |
|---|---|---|
| `price: number` | aritmética runtime, stale | `priceLabel: string` "Desde $X/mes + IVA" (copy puro) |
| Corporate en `SUPPORTED_PLANS` | fuga al pago | Marketing-only: `PLANS_CONFIG` + `sitePlans`, CTA "Cotizar" |
| Montos stale en `confirm-payment-dialog` | viola piso anti-undercut | 390K/790K/1590K |

### D5: Migración soft
Upgrade/downgrade cambia solo `tenant.plan`; sin borrado; el medidor refleja exceso.

## Data Flow

```
Webhook → handler.py → Message(origin) → messages
GET /plans/usage → get_plan_limits + COUNT(IA mes, tenant) + Σ products + COUNT(UserTenant)
ClientDashboard → usePlanUsage(tenant) → widget (barra/CTA)
```

## File Changes

| File | Action | Descripción |
|---|---|---|
| `nc-api/app/modules/conversations/models.py` | Modify | Columna `origin` |
| `nc-api/app/db/migrations/versions/<hex>_add_message_origin.py` | Create | `add_column` nullable; head `f1a2b3c4d5e6` |
| `nc-api/app/modules/evolution/handler.py` | Modify | Setear `origin` en 3 outbounds |
| `nc-api/app/modules/plans/capabilities.py` | Modify | Docstring semántica |
| `nc-api/app/modules/plans/schemas.py` | Create | `PlanUsageResponse` |
| `nc-api/app/api/v1/plans.py` | Create | `GET /usage` |
| `nc-api/app/api/v1/router.py` | Modify | Include `plans_router` |
| `nc-dashboard/lib/types/plan.ts` | Create | Tipo `PlanUsage` |
| `nc-dashboard/lib/api.ts` | Modify | `getPlanUsage()` |
| `nc-dashboard/hooks/use-plan-usage.ts` | Create | Refetch por tenant |
| `nc-dashboard/app/dashboard/components/plan-usage-widget.tsx` | Create | Barra+CTA+exceso; enterprise; error → oculto |
| `nc-dashboard/app/dashboard/page.tsx` | Modify | Widget tras "Plan Actual" |
| `nc-dashboard/app/dashboard/components/plan-card.tsx` | Modify | `priceLabel` + `corporate` (CTA "Cotizar") |
| `nc-dashboard/app/dashboard/tenants/components/confirm-payment-dialog.tsx` | Modify | Montos Escenario A |
| `nc-dashboard/data/site.ts` | Modify | Precios + corporate + fila acceso cliente + planInfo |
| `docs/strategy/plan-de-negocio.md` | Modify | Escenario A |

## Interfaces / Contracts

```
GET /api/v1/plans/usage → 200
{ "plan": "professional",
  "limits": {"max_agents":5, "max_products":50, "max_conversations_per_month":5000, "max_businesses":3},
  "usage": {"ai_responses":1200, "products":12, "businesses":2},
  "pct": 24, "over_limit": false }
```
401 sin sesión; 404 sin tenant; enterprise → `pct: null`.

## Testing Strategy

| Capa | Qué | Cómo |
|---|---|---|
| pytest | Happy path, over-limit soft, aislamiento, 401, no-IA, downgrade preserva datos | `test_plan_usage.py` |
| pytest | `origin` en 3 caminos; NULL en admin/inbound | `test_message_origin.py` |
| pytest | Límites por plan + fallback; FAQ taggea `programmed` | Ext. `test_plan_capabilities.py` y `test_programmed_responses.py` |
| Vitest | Barra, CTA, exceso, enterprise, error, switch tenant | `plan-usage-widget.test.tsx` |
| Vitest | Escenario A + corporate gated | Ext. `plan-card`/`plans`/`payment-screen` |
| Vitest | Fila acceso cliente, sin IA en básico, trial programado | Test `site.ts` |
| Manual | `plan-de-negocio.md` | Revisión |

## Migration / Rollout

Alembic aditivo (nullable, sin backfill). Deploy 1→6; revert inverso.

## Slices (stacked-to-main, ≤400 líneas/PR)

1. Límites reales: `capabilities.py` + `schemas.py`.
2. Message origin: modelo + migración + handler.
3. Usage endpoint: `plans.py` + router.
4. Dashboard widget: types + `api.ts` + hook + widget + `page.tsx` (4b: separar hook/types de UI).
5. Pricing + landing: `plan-card.tsx`, `confirm-payment-dialog.tsx`, `site.ts`, corporate.
6. Docs + archive: `plan-de-negocio.md`.

## Open Questions

- [ ] `pct` como % IA vs max() de las 3 métricas — spec ambiguo; decidí primaria.
- [ ] Indexar `(tenant_id, created_at)` — v1 OK.