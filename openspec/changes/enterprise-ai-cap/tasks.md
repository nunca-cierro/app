# Tasks: Enterprise AI Fair-Use Cap (100.000 respuestas IA/mes)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~170 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
800-line budget risk: Low

### Work Units (commits to main)

| Unit | Goal | Files |
|------|------|-------|
| 1 | Backend cap flip, tests-first | backend files + 3 pytest |
| 2 | Frontend data + copy | plans.ts, site.ts + test |
| 3 | Widget CTA hides for enterprise | widget.tsx + 2 vitest |
| 4 | Copy surfaces + pins | plan-card/page.tsx + pins |

## Unit 1 — Backend cap + tests

- [ ] 1.1 RED `nc-api/tests/test_plan_capabilities.py:201-208`: enterprise `max_conversations_per_month == 100000`, others None → FAILS (now None)
- [ ] 1.2 RED `nc-api/tests/test_plan_usage.py`: :40-44 cap 100000; :102-112 pct 10; :395-417 endpoint limit 100000, pct 0 → FAILS
- [ ] 1.3 RED `nc-api/tests/test_message_origin.py`: +2 enterprise scenarios — patch `app.modules.evolution.handler._count_ai_responses_this_month` AsyncMock → 100000 ⇒ `origin="programmed"`, no LLM; → 99999 ⇒ `origin="ai"`, LLM awaited. Patch only (100K seed too slow) → FAILS
- [ ] 1.4 GREEN `nc-api/app/modules/plans/capabilities.py`: :109 None→100000; docstrings :14-15, :81-86 (None=unlimited scoped to others)
- [ ] 1.5 GREEN `nc-api/app/modules/evolution/handler.py:973`: comment → 100.000 cap + soft degrade; grep-verify
- [ ] 1.6 GREEN `nc-api/app/api/v1/plans.py:6-7, :44-45`: drop "unlimited (enterprise)" docstrings; grep-verify
- Verify: `pytest tests/test_plan_capabilities.py tests/test_plan_usage.py tests/test_message_origin.py` (nc-api)

## Unit 2 — Frontend data + copy

- [ ] 2.1 RED `nc-dashboard/data/__tests__/site.test.ts:51`: → "100.000 (~25.000 conversaciones)"; pin `planInfo.enterprise.maxConversations === 100000`; no-"ilimitadas"-IA check → FAILS
- [ ] 2.2 RED (already-RED in tree) `site.test.ts:52`: → "~4 respuestas por conversación" (matches tree lib/plans.ts:40-41); test-only fix
- [ ] 2.3 GREEN `nc-dashboard/lib/plans.ts:26` → "Hasta 100.000 respuestas con IA al mes" (keep :40-41); `nc-dashboard/data/site.ts:211` → "100.000 (~25.000 conversaciones)", :252 maxConversations null→100000; :193 inherits PLAN_AI_CAPS
- Verify: `npx vitest run data/__tests__/site.test.ts` (nc-dashboard)

## Unit 3 — Widget CTA hides for enterprise

- [ ] 3.1 RED `nc-dashboard/app/dashboard/components/__tests__/plan-usage-widget.test.tsx`: `makeUsage` gains `plan`; `shouldShowUpgradeCta` → 2-arg; + enterprise pct 90/105 ⇒ CTA hidden → FAILS
- [ ] 3.2 RED `nc-dashboard/app/dashboard/__tests__/client-dashboard-plan-usage.test.tsx:175-196`: enterprise → pct 90, limit 100000 ⇒ bar visible, "100.000", no "Mejorar plan" → FAILS
- [ ] 3.3 GREEN `nc-dashboard/app/dashboard/components/plan-usage-widget.tsx`: `shouldShowUpgradeCta(pct, plan)` → `pct !== null && pct >= 80 && plan !== "enterprise"`; call passes `data.pct, data.plan`; keep bar + over-limit text
- Verify: `npx vitest run app/dashboard/components/__tests__/plan-usage-widget.test.tsx app/dashboard/__tests__/client-dashboard-plan-usage.test.tsx`

## Unit 4 — Copy surfaces + pins

- [ ] 4.1 RED `nc-dashboard/app/dashboard/components/__tests__/plan-card.test.ts`: enterprise features contain "Hasta 100.000 respuestas con IA al mes", NOT "Respuestas con IA ilimitadas" (existing ilimitados test passes) → FAILS
- [ ] 4.2 GREEN `nc-dashboard/app/dashboard/components/plan-card.tsx:49` → new copy
- [ ] 4.3 RED `client-dashboard-plan-usage.test.tsx`: banner shows new copy, not "Respuestas con IA ilimitadas" → FAILS
- [ ] 4.4 GREEN `nc-dashboard/app/dashboard/page.tsx:534` → new copy (banner)
- Verify: `npx vitest run app/dashboard/components/__tests__/plan-card.test.ts app/dashboard/__tests__/client-dashboard-plan-usage.test.tsx` + grep: no "ilimitadas" AI copy

## Apply rules

Strict TDD per unit (safety net → RED → GREEN → triangulate → refactor). Commits to main without push; no git add/stage — owner reviews tree.