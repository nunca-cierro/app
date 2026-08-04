# Template / Brand Residue — Inventory

> **Phase scope**: documentation only. This inventory maps every known residue
> of the platform's own brand/template (slug `nuncacierro`, seed templates,
> RBAC/plan contradictions, LLM provider coupling) so a later phase can
> redesign plans/dashboard and refactor multi-provider with a complete list.
> **No implementation happens in this phase.**

Verified against the working tree on 2026-08-03.

## 1. Hardcoded business slug `"nuncacierro"` (backend — 6 refs)

The product's own tenant is special-cased by slug. These should move to a
single config flag (e.g. `INTERNAL_TENANT_SLUG` in settings) before any
tenant onboarding change.

| File | Line | Behavior |
|------|------|----------|
| `nc-api/app/api/v1/auth.py` | 143 | `payment_status=ACTIVE` if slug == "nuncacierro" |
| `nc-api/app/api/v1/auth.py` | 189 | idem (register/me payload) |
| `nc-api/app/api/v1/auth.py` | 226 | idem |
| `nc-api/app/api/v1/tenants.py` | 112 | idem (tenant list) |
| `nc-api/app/api/v1/tenants.py` | 140 | idem (tenant get) |
| `nc-api/app/modules/evolution/handler.py` | 445 | skips payment enforcement for own tenant |

Not residue: `nc-api/app/modules/evolution/adapter.py:16` — docstring example
(`"instance_name": "nuncacierro"`), harmless documentation.

## 2. Hardcoded business slug `"nuncacierro"` (frontend — 1 ref)

| File | Line | Behavior |
|------|------|----------|
| `nc-dashboard/app/dashboard/page.tsx` | 105 | excludes own tenant from "pending payment" attention list |

## 3. Seed templates — 10 entries = 5 duplicated pairs

`nc-api/app/modules/agents/templates.py` — `SEED_TEMPLATES` (lines 26–500)
contains pairs with identical category and content, differing only in emoji
in name/instructions:

| Category | Pair |
|----------|------|
| `restaurante` | "Restaurante 🍽️" + "Restaurante" |
| `panaderia` | "🥖 Panadería" + "Panadería" |
| `hamburgueseria` | "🍔 Hamburguesería" + "Hamburguesería" |
| `barberia` | "Barbería 💈" + "Barbería" |
| `clinica` | "🏥 Clínica" + "Clínica" |

Also noted in exploration: template categories (`restaurante/panaderia/
hamburgueseria/barberia/clinica`) diverge from landing demo categories
(`barberia/beauty/dental/gym/restaurant/spa`). Dedup + category alignment is
a future phase decision.

## 4. RBAC / plan contradiction (dashboard access)

- `nc-dashboard/lib/rbac.ts:33` — `/dashboard` allowed for ALL roles.
- `nc-dashboard/components/layout/sidebar.tsx:66-68` — returns no nav items for `client` + `basic`.
- `nc-dashboard/app/dashboard/page.tsx:485-496` — renders "Sin acceso" screen for `client` + `basic`.

Result: clients with Basic plan authenticate and reach the shell, then get a
denied screen — capability logic is duplicated client-side without
server-side enforcement. Plans redesign is a separate phase (explicitly out
of scope here).

## 5. LLM provider coupling (Groq-only, pre multi-provider)

- `nc-api/app/modules/integrations/llm/provider.py` — concrete `GroqClient`
  singleton imported directly by handlers; not an isolated interface.
- `AiAgent.provider` field exists (default `groq`) but is NOT used for routing.
- `nc-dashboard/app/dashboard/agents/components/agent-form.tsx:53-54,152-157`
  — provider/model hardcoded (`groq` / `openai/gpt-oss-120b`, hidden inputs).

Documented alternative (not enabled): `qwen/qwen3.6-27b` (preview) per Groq
docs — see `nc-api/app/core/config.py` and `.env.production`.

## 6. Payment config drift (billing)

- `nc-api/tests/conftest.py:14` sets `PAYMENT_NEQUI_NUMBER`; the SDD payment
  design asked for Nequi + Bre-B, but the implementation only reads
  `payment_breb_number` / `payment_account_holder` (`nc-api/app/core/config.py:131-133`).
  `PAYMENT_NEQUI_NUMBER` is dead config.

## Next phases (not part of this change)

1. Plans/RBAC: server-side capability matrix (`require_plan`), unify client
   access, remove the `client+basic` denial contradiction.
2. Multi-provider LLM: `LLMProvider` protocol + registry keyed by
   `AiAgent.provider`; decide qwen preview vs gpt-oss default.
3. Template dedup: drop the emoji/plain duplicated pairs and align categories
   with the landing demos.
4. De-hardcode the own-business slug via a settings flag.
