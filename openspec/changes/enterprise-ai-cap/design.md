# Design: Enterprise AI Fair-Use Cap (100.000 respuestas IA/mes)

## Technical Approach

Flip the backend `PLAN_LIMITS` enterprise entry `None` → `100000` (`capabilities.py:109`).
The soft-cap gate (`handler.py:976`, plan-agnostic) and programmed-FAQ fallback (:985-1070)
auto-activate — zero new enforcement logic. Sync copy in the 4 frontend surfaces + data; hide the
upgrade CTA on the top plan in the usage widget.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Backend constant home | Literal `100000` inside `PLAN_LIMITS["enterprise"]` | Named constant `ENTERPRISE_AI_CAP`; config/env var | `PLAN_LIMITS` is already the single source (spec `EnterpriseAILimit`); matches trial/basic/professional literals (500/2000/10000). No new indirection for one value. |
| Frontend caps source | `PLAN_AI_CAPS` stays hardcoded copy | Public caps endpoint feeding the landing | No public caps endpoint exists; `GET /plans/usage` is authenticated tenant-only. **Flagged drift risk**: frontend/backend caps stay manually synced — out of scope to unify (proposal §Out of Scope). |
| At-cap handler test strategy | Patch `_count_ai_responses_this_month` (module fn in `app.modules.evolution.handler`, def :109, called :977) `AsyncMock` → 100000 | Seed 100000 `origin='ai'` rows via `reach_ai_cap=True` | Seeding 100K rows is absurdly slow; patch isolates the gate. Below-cap variant returns 99999. Import path verified. |
| Widget CTA change | `shouldShowUpgradeCta(pct, plan)` → `pct !== null && pct >= 80 && plan !== "enterprise"`; call site passes `data.plan` | Separate `plan` prop; new state | Widget already receives `data: PlanUsage` (has `plan`). No component signature change; bar + over-limit text stay; "unlimited" branch stays defensive. |
| `plans.py` docstrings (:6-7, :44-45) | Opportunistic cleanup of "unlimited (enterprise)" wording | Leave stale | **Flagged**: not a behavior change; `compute_pct` logic already correct (None only when limit None/0). Included for coherence. |

## Data Flow

    PLAN_LIMITS["enterprise"] (100000)
        │  get_plan_limits(tenant.plan)
        ▼
    handler.py:976 gate ── at/over cap? ──→ programmed FAQ path (origin="programmed")
        │ under cap
        ▼ LLM flow (origin="ai")
    GET /plans/usage ──→ limits.max_conversations_per_month=100000, pct numeric ──→ widget (bar, no CTA for enterprise)

## File Changes (APPLY list)

| File | Action | Change |
|---|---|---|
| `nc-api/app/modules/plans/capabilities.py` | Modify | :109 `None`→`100000`; docstring :14-15 + limits comment :81-86: "None = unlimited" now scoped to agents/products/businesses; AI cap 100.000 enterprise |
| `nc-api/app/modules/evolution/handler.py` | Modify | :973 comment → describe enterprise 100.000 fair-use cap + soft degrade (not "unlimited") |
| `nc-api/app/api/v1/plans.py` | Modify | Opportunistic: docstrings :6-7, :44-45 drop "unlimited (enterprise)" (pct None only when limit None/0) |
| `nc-dashboard/lib/plans.ts` | Modify | :26 `PLAN_AI_CAPS.enterprise` → "Hasta 100.000 respuestas con IA al mes". Keep working-tree :40-41 note (already "~4 respuestas por conversación") |
| `nc-dashboard/data/site.ts` | Modify | :211 comparison → "100.000 (~25.000 conversaciones)"; :252 `maxConversations` null→`100000` (+comment); :193 inherits constant, no literal edit |
| `nc-dashboard/app/dashboard/components/plan-card.tsx` | Modify | :49 → "Hasta 100.000 respuestas con IA al mes" |
| `nc-dashboard/app/dashboard/page.tsx` | Modify | :534 → "Hasta 100.000 respuestas con IA al mes" |
| `nc-dashboard/app/dashboard/components/plan-usage-widget.tsx` | Modify | `shouldShowUpgradeCta(pct, plan)`; render `shouldShowUpgradeCta(data.pct, data.plan)` |
| `nc-api/tests/test_plan_capabilities.py` | Modify | :201-208 pin → cap 100000, others None (BREAKS) |
| `nc-api/tests/test_plan_usage.py` | Modify | :40-44 cap 100000; :102-112 numeric pct (10); :395-417 numeric cap/pct 0 (BREAKS) |
| `nc-api/tests/test_message_origin.py` | Modify | +2 enterprise scenarios (at-cap programmed via patch 100000; below-cap AI via patch 99999) |
| `nc-dashboard/data/__tests__/site.test.ts` | Modify | :51 → "100.000 (~25.000 conversaciones)"; :52 fix RED → "~4 respuestas por conversación"; + planInfo 100000 pin, no-unlimited-AI-copy check |
| `nc-dashboard/app/dashboard/__tests__/client-dashboard-plan-usage.test.tsx` | Modify | :175-196 enterprise pin → capped bar, no CTA (BREAKS) |
| `nc-dashboard/app/dashboard/components/__tests__/plan-usage-widget.test.tsx` | Modify | `makeUsage` gains plan param; all `shouldShowUpgradeCta` call sites; + enterprise CTA-hidden scenarios (90, 105) |
| `nc-dashboard/app/dashboard/components/__tests__/plan-card.test.ts` | Modify | + pin "Hasta 100.000 respuestas con IA al mes", not "Respuestas con IA ilimitadas"; existing "ilimitados" test still passes (products line) |

## Interfaces / Contracts

`PlanUsage` (lib/types/plan.ts) unchanged — `plan` field already present; widget reads `data.plan`.
No API contract changes: `PlanLimits.max_conversations_per_month` already `int | None`.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Backend unit | enterprise limits | Update pins `test_plan_capabilities.py:201-208`, `test_plan_usage.py:40-44` |
| Backend handler | at-cap degrade, below-cap AI (no superadmin bypass holds by construction — no role input) | `test_message_origin.py`: patch counter → 100000 / 99999; assert `origin` + Groq awaited/not |
| Backend endpoint | numeric pct for enterprise | Update `test_plan_usage.py:102-112, :395-417` |
| Frontend | copy/data pins + widget CTA | `site.test.ts`, `plan-card.test.ts`, `plan-usage-widget.test.tsx`, `client-dashboard-plan-usage.test.tsx` |

## Migration / Rollout

No migration, no feature flag. Value flip activates the soft gate for enterprise immediately
(soft degrade, FAQ continues; widget informs). Rollback = revert :109 + copy + pins.

## Open Questions

None blocking. NoSuperadminBypass (spec scenario) satisfied by construction — gate reads `tenant.plan` only; handler takes no role input.