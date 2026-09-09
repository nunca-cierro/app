# Tasks: LLM Multi-Provider (OpenAI default + Groq optional)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1100 (additions+deletions, 25+ files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Slice 1) → PR 2 (Slice 2) → PR 3 (Slice 3), stacked |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend core: LLMClient + routing + handlers + agent defaults | PR 1 | base main; compiles + handler/provider tests green with dummy OpenAI key |
| 2 | Config/deploy + migration: settings/fail-fast, compose, .env.example, alembic | PR 2 | base PR 1 branch; boot fail-fast + migration idempotent/reversible |
| 3 | Frontend sync + dep swap + full suite | PR 3 | base PR 2 branch; dashboard parity + all tests green |

Note: `conftest.py` dummy keys move from Slice 3 → Slice 1 (hard dependency: provider.py reads `settings.openai_*` at import; without the env keys Slice 1 cannot boot or run tests).

## Phase 1: Backend core (Slice 1 — PR 1)

- [x] 1.1 Rewrite `nc-api/app/modules/integrations/llm/provider.py`: `GroqClient`→`LLMClient` on `AsyncOpenAI`, add `provider` param, active-resolution + deprecated fallback (`DEPRECATED_GROQ_MODELS`), token-budget trim (`tokens ≈ len//3`, budget `settings.llm_history_token_budget`), `is not None` knobs, per-active-provider rate tracker; `llm_client` singleton replaces `groq_client`; drop `CONTEXT_WINDOW_SIZE`
- [x] 1.2 `nc-api/app/modules/agents/models.py`: ORM defaults `provider="openai"`, `model=DEFAULT_LLM_MODEL` (temperature stays 0)
- [x] 1.3 `nc-api/app/modules/agents/schemas.py`: `SUPPORTED_PROVIDERS={"openai","groq"}`, `_AgentParams.provider="openai"`, `AiAgentCreate.model=DEFAULT_LLM_MODEL`
- [x] 1.4 `nc-api/app/api/v1/agents.py` from-template: `provider="openai"`, `model=DEFAULT_LLM_MODEL`
- [x] 1.5 `nc-api/app/modules/evolution/handler.py`: `groq_client`→`llm_client`, pass `provider=agent.provider`, history `.limit(30)` (keep `<user_query>` wrap)
- [x] 1.6 `nc-api/app/modules/telegram/handler.py`: same rename + `provider` + `.limit(30)` (keep wrap)
- [x] 1.7 `nc-api/app/modules/integrations/webhook.py`: same rename + `provider` + `.limit(30)`; wrap `msg["text"]` in `<user_query>` (line ~249)
- [x] 1.8 `nc-api/tests/conftest.py`: `setdefault("LLM_PROVIDER","openai")` + dummy `OPENAI_API_KEY` before app import (moved from Slice 3 — dependency)
- [x] 1.9 Create `nc-api/tests/test_llm_provider.py`: unit tests — provider mismatch fallback + warning, deprecated-model fallback, matching provider/model pass-through, temp 0 preserved / None→0.7, max_tokens None→1024, history trimmed to budget / short untouched (patch `llm_client._client` with `AsyncMock`, mirror `test_agent_model_migration.py`); update `test_agent_model_migration.py` runtime-defense to `llm_client` + `settings.openai_model`
- [x] 1.10 Update handler tests asserting `provider=` kwarg, `.limit(30)`, Meta `<user_query>` wrap, evo/tg wrap unchanged (`test_webhook_handler.py`, `test_telegram_handler.py`, `test_evolution_webhook_auth.py`, `test_agent_connection_link.py`)
- [x] 1.11 Mechanical mock renames `groq_client`→`llm_client` in: `test_webhook_routing.py`, `test_agent_connection_integration.py`, `test_evolution_keywords.py`, `test_message_dedup.py`, `test_programmed_responses.py`, `tests/modules/evolution/test_natural_tone_prompt.py`, `test_handler_spam.py`, `test_evolution_adapter.py`
- [x] 1.12 Update agent-default seeds/asserts to `openai`/`gpt-4o-mini`: `test_agent_crud.py` (`_create_agent`, patch `{"provider":"made-up"}` expects `openai`), `test_agent_prompt_create.py`, `test_agent_max_tokens_migration.py`, `test_agent_templates.py` (from-template)
- [x] 1.13 Verify: `cd nc-api && uv run pytest` — all green (no config.py changes yet; `.env.example` still has `GROQ_API_KEY` so settings boot)

## Phase 2: Config/deploy + migration (Slice 2 — PR 2)

- [x] 2.1 `nc-api/app/core/config.py`: add `llm_provider="openai"`, `openai_api_key=""`, `openai_model=DEFAULT_LLM_MODEL`, `openai_temperature=0.7`, `openai_max_tokens=DEFAULT_MAX_TOKENS`, `openai_rate_limit_rpm=500`, `llm_history_token_budget=2000`, `DEFAULT_LLM_MODEL="gpt-4o-mini"`, `PROVIDER_BASE_URLS` map; keep `groq_*` + `DEFAULT_GROQ_MODEL`/`DEPRECATED_GROQ_MODELS`; `model_validator(mode="after")` fail-fast naming exact active var (`OPENAI_API_KEY`/`GROQ_API_KEY`)
- [x] 2.2 `nc-api/.env.example`: dual commentable `openai_*`/`groq_*` blocks + `LLM_PROVIDER` selector
- [x] 2.3 `docker-compose.yml`: `GROQ_API_KEY: ${GROQ_API_KEY:-}` (drop `:?`), add `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_RATE_LIMIT_RPM`
- [x] 2.4 Create `nc-api/app/db/migrations/versions/c0d1e2f3a4b5_rewrite_legacy_agent_provider.py`: revision `c0d1e2f3a4b5`, `down_revision='d5e6f7a8b9c0'`; upgrade rewrites `provider='groq' AND model IN ('openai/gpt-oss-120b','openai/gpt-oss-20b')` → `openai`/`gpt-4o-mini` (idempotent, `rowcount` print); downgrade restores `groq`/`openai/gpt-oss-120b`; custom Groq rows untouched
- [x] 2.5 Update `nc-api/tests/test_config.py`: `_settings()` gains `openai_api_key="test-key"`; new tests — invalid provider rejected, active-key fail-fast names exact var, OpenAI active w/o Groq key OK, `llm_history_token_budget==2000`
- [x] 2.6 Create `nc-api/tests/test_agent_provider_migration.py`: replay c0d1e2f3a4b5 SQL — legacy rewritten, custom Groq dormant, idempotent, downgrade restores (pattern from `test_agent_model_migration.py`)
- [x] 2.7 Verify: boot fail-fast (`OPENAI_API_KEY` empty → import raises); `cd nc-api && uv run pytest` green

## Phase 3: Frontend sync + dependency swap + full coverage (Slice 3 — PR 3)

- [x] 3.1 `nc-dashboard/lib/schemas/agent.ts`: `z.enum(["openai","groq"])`, `defaultAgentValues` → `openai`/`gpt-4o-mini`, prune `anthropic` from `MODELS_BY_PROVIDER`
- [x] 3.2 `nc-dashboard/lib/schemas/agent.test.ts`: update fixtures to new defaults; add both-provider acceptance + defaults parity tests
- [x] 3.3 `nc-dashboard/app/dashboard/agents/components/agent-form.tsx`: provider/model UI + hidden inputs to `openai`/`gpt-4o-mini`
- [x] 3.4 `nc-dashboard/app/dashboard/agents/[id]/page.tsx`: edit `defaultValues.provider="openai"`
- [x] 3.5 `nc-api/pyproject.toml`: remove `groq>=1.2.0`, add `openai`; regenerate `nc-api/uv.lock` (`uv lock`)
- [x] 3.6 Remaining test updates + polish: verify `cd nc-api && uv run pytest` full suite; `cd nc-dashboard && npx vitest run` green; README `.env` block (dual providers) parity