# Archive Report — plan-differentiation

**Change**: plan-differentiation
**Archived to**: `openspec/changes/archive/2026-09-10-plan-differentiation/`
**Date**: 2026-09-10
**Executed by**: sdd-archive executor (deepseek-v4-flash)
**Verification**: PASS WITH WARNINGS (verdict `sdd/plan-differentiation/verify-report`, obs #1106) — archive permitted, sin CRITICAL. Warnings 1-3 reconocidos y trackeados por el owner (switch tenant limitación de entorno, metering solo-Evolution, docs de ventas stale gitignored).

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| plan-usage-metering | Created (full spec, no prior main spec) | 6 requirements, 16 scenarios (15 COMPLIANT / 1 PARTIAL en verify) |
| plan-catalog | Created (full spec, no prior main spec) | 5 requirements, 10 scenarios (10/10 COMPLIANT) |

- `openspec/specs/plan-usage-metering/spec.md` — copy directa del delta (spec completo).
- `openspec/specs/plan-catalog/spec.md` — copy directa del delta (spec completo).

Ningún main spec previo existía para estos dominios (`openspec/specs/` solo tenía llm-configuration, llm-client-routing, ai-agent-model); por lo tanto no hubo merge destructivo — no se eliminaron ni modificaron requirements existentes.

## Archive Contents

- proposal.md ✅
- exploration.md ✅
- design.md ✅
- tasks.md ✅ (25/25 tasks complete, Phases 1-5 `[x]`)
- specs/plan-usage-metering/spec.md ✅
- specs/plan-catalog/spec.md ✅
- verify-report.md ✅ (PASS WITH WARNINGS, archive permitted)

## Source of Truth Updated

- `openspec/specs/plan-usage-metering/spec.md`
- `openspec/specs/plan-catalog/spec.md`

## Implementation Snapshot

- **Commits**: `424952a`..`4c76902` (5 slices, stacked-to-main, sin push, HEAD `4c76902`).
- **Build**: `npx tsc --noEmit` exit 0 (nc-dashboard).
- **Tests**: 705 pytest (nc-api) + 389 vitest (nc-dashboard), todos verdes en ejecución fresca.
- **Migration head**: SINGLE `e3f4a5b6c7d8` (historia lineal, sin heads paralelos).

## Traceability (Engram observation IDs)

| Artifact | Engram obs |
|----------|------------|
| Owner decisions validadas (2026-09-10) | #640 |
| sdd/plan-differentiation/apply-progress | #1101 |
| sdd/plan-differentiation/verify-report | #1106 |
| Queued follow-ups del owner | #1107 |

Nota: proposal/specs/design/tasks vivieron en filesystem openspec (sin observaciones Engram dedicadas); apply-progress y verify-report sí fueron persistidos a Engram. Este archive-report queda como obs de cierre con topic_key `sdd/plan-differentiation/archive-report`.

## Queued Future Change (NO parte de este archive)

El change se cierra COMO-ESTÁ: trial/basic FAQ-only (sin IA), límites 100% soft, Corporativo marketing-only. El owner tiene encolado un follow-up que moverá `CAP_AI` a basic con límites reducidos — ⚠️ CONTRADICE la decisión SDD #2 y NO se pliega aquí (obs #1107, item 1). Sigue siendo válida la decisión de este cambio; el follow-up será un cambio SDD separado.

## Warnings Carry-Over (reconocidos por el owner)

1. TenantSwitchPreservesCounters PARTIAL — glue del switch implementado pero no probado en runtime (entorno vitest node/SSR). Limitación del patrón del repo, no defecto de lógica.
2. Metering solo canal Evolution — outbounds de Telegram (`telegram/handler.py`) y Meta legacy (`integrations/webhook.py`) sin `origin` no cuentan. Soft e informativo; decisión multi-canal pendiente del owner.
3. Sales docs stale $60K/$120K/$250K — `docs/sales/*` gitignored, fuera de commits; pasada de docs local pendiente (el más urgente: `manual-de-ventas.md` L31).

## SDD Cycle Complete

plan-differentiation: planificado → implementado (25/25 tasks, strict TDD) → verificado (PASS WITH WARNINGS) → archivado. Ready para el siguiente cambio (follow-up Básico con IA limitada cuando el owner lo lance).