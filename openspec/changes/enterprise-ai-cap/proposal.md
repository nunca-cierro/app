# Proposal: Enterprise AI Fair-Use Cap

## Intent

Empresarial today has UNLIMITED AI responses (`capabilities.py:109` = `None`) with zero spend tracking — margin risk on Groq/OpenAI. Add a fair-use monthly cap with the existing SOFT degradation (bot falls back to programmed FAQ when exhausted — same path as Trial/Básico/Profesional). Owner-approved direction; proposed value **100.000 respuestas IA/mes** (owner to confirm). Break-even ≈222K/mes (Groq gpt-oss-120b), ≈724K/mes (OpenAI gpt-4o-mini) → 100K sits safely under.

## Scope

### In Scope
- Backend: enterprise cap `None → 100000` (1-line) + docstring/comment updates; soft-cap gate auto-activates (gate code is plan-agnostic — no logic change).
- Copy sync across 4 hardcoded surfaces + data, per marketing skill (tuteo, honestidad).
- Test updates: 3 backend + 2 frontend + 1 pin (enterprise "unlimited" contract → capped).

### Out of Scope
- Per-tenant spend/cost alerts.
- Unifying `PLAN_AI_CAPS` vs backend caps via a public endpoint (no caps endpoint feeds the landing; `GET /plans/usage` is authenticated tenant-only).
- Superadmin bypass (default: none — superadmins on enterprise also gated; open question).
- Removing widget "unlimited" branch (defensive, harmless) and pricing changes.

## Capabilities

### New Capabilities
None — soft-cap + FAQ-fallback behavior already exists and is plan-agnostic; only a limit value changes.

### Modified Capabilities
- `plan-usage-metering`: `EffectivePlanLimits` — enterprise `max_conversations_per_month` ∞ → 100.000; enterprise `pct` becomes numeric (no longer null).
- `plan-catalog`: `LandingCoherence` — enterprise "Respuestas con IA" surfaces ("Ilimitadas"/null) → capped copy/100000.

## Approach

1. `capabilities.py:109` → `100000`; update docstrings :15, :81 and handler.py:973 comment.
2. Soft cap auto-activates: handler.py:976 gate + degrade-to-FAQ :985-1070; meter `app/api/v1/plans.py:41-49` now returns numeric pct for enterprise.
3. Copy: `lib/plans.ts:26` → "Hasta 100.000 respuestas con IA al mes"; `site.ts:211` enterprise → "100.000 (~25.000 conversaciones)" (÷4, matches Básico/Profesional style); `site.ts:193` inherits via `PLAN_AI_CAPS.enterprise`; `site.ts:252` → 100000; `plan-card.tsx:49` + `page.tsx:534` same wording. Keep owner's uncommitted `CONVERSATION_ESTIMATE_NOTE` ("~4 respuestas por conversación", lib/plans.ts:40-41).
4. Update the 6 tests below.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `nc-api/app/modules/plans/capabilities.py:109` | Modified | `max_conversations_per_month: None → 100000` (+ docstrings :15, :81) |
| `nc-api/app/modules/evolution/handler.py:973` | Modified | Stale "None cap (enterprise) = unlimited" comment |
| `nc-dashboard/lib/plans.ts:26` | Modified | `PLAN_AI_CAPS.enterprise` copy (working tree already has :40-41 note change) |
| `nc-dashboard/data/site.ts:193, :211, :252` | Modified | package feature, comparison row, `planInfo.maxConversations` |
| `nc-dashboard/app/dashboard/components/plan-card.tsx:49` | Modified | feature copy |
| `nc-dashboard/app/dashboard/page.tsx:534` | Modified | feature list copy |
| `nc-api/tests/test_plan_capabilities.py:201-208` | Modified | unlimited → 100000 cap (BREAKS) |
| `nc-api/tests/test_plan_usage.py:40-44, :395-417` | Modified | None assertions → cap / numeric pct (BREAKS; :169-178 passes) |
| `nc-dashboard/data/__tests__/site.test.ts:51-52` | Modified | :51 cap value (BREAKS); :52 already-red "~4 mensajes" note |
| `nc-dashboard/app/dashboard/__tests__/client-dashboard-plan-usage.test.tsx:175-196` | Modified | pin enterprise capped contract |

## Open Questions (specs must resolve with owner)

1. Cap value: confirm **100.000 respuestas IA/mes**.
2. Exact copy strings per marketing skill (tuteo, honestidad — "uso justo" framing).
3. Superadmin bypass on enterprise cap? (default: no).
4. Keep "~25.000 conversaciones" (÷4) estimate in the comparison row?

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing enterprise tenants near/over 100K hit soft cap immediately | Low | Soft degrade (FAQ continues); widget informs; monitor |
| Widget CTA "Mejorar plan" at ≥80% on top plan is meaningless | Low | Flag; hide CTA for enterprise if owner approves (deferred) |
| Copy drift across 4 surfaces | Med | Reuse `PLAN_AI_CAPS` where possible; tests pin values |
| `plan-usage-metering` spec table (∞) stale | Med | Delta spec in this change |

## Rollback Plan

Revert `capabilities.py:109` to `None`, restore copy strings and test pins. One-line backend revert, no data migration.

## Dependencies

None external. Break-even figures from business decision (owner-provided; validate in specs).

## Success Criteria

- [ ] `pytest` green: capabilities + usage suites
- [ ] `vitest` green: site, plan-card, client-dashboard-plan-usage
- [ ] Enterprise >100K AI resp/mes falls back to FAQ (gate active)
- [ ] `GET /plans/usage` enterprise → limit 100000, numeric pct
- [ ] No "ilimitadas" AI copy left in dashboard/landing