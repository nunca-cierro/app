# Design: LLM Multi-Provider (OpenAI default + Groq optional)

## Technical Approach

Unify LLM access behind a single `LLMClient` built on the **OpenAI SDK** (`AsyncOpenAI`), routing to the active provider via a `base_url` map. `LLM_PROVIDER` (default `openai`) selects the active provider; fail-fast at settings load rejects boot if the **active** provider's key is missing. Agent rows still store `provider`/`model`; runtime routing falls back to the active default whenever the stored provider doesn't match `LLM_PROVIDER` or the model is deprecated, logging a warning. A targeted alembic migration (child of `d5e6f7a8b9c0`) rewrites legacy default rows to `openai`/`gpt-4o-mini`; custom Groq rows stay dormant. Delivered as 3 stacked PRs (see Slice Mapping).

**OpenAI SDK vs Groq SDK for the Groq path — verified correct.** Groq exposes an OpenAI-compatible `/openai/v1` endpoint; the `openai` Python SDK officially supports any OpenAI-compatible provider via `AsyncOpenAI(api_key=..., base_url=...)` (confirmed in SDK docs/tests). This drops the `groq` dependency with **no streaming or error-surface change** because today's `provider.py` uses only synchronous-ish `chat.completions.create(...)` (await) with a plain `except Exception` wrapper — no streaming, no SDK-specific timeout, no typed errors. **Behavior to preserve:** (1) `except Exception → raise RuntimeError` wrapper; (2) default timeout (SDK `timeout=600s` applies; current code relies on SDK default and we keep it); (3) log `model` + `usage.total_tokens` on success; (4) empty-response guard is in handlers, untouched.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|---|---|---|---|
| Client base | `openai` SDK vs keep `groq` SDK | groq SDK is provider-locked; openai SDK covers both via base_url | `AsyncOpenAI` + base_url map |
| Active provider resolution | env-only vs per-request | env-only is deploy-driven and matches "global default"; per-request adds no value here | `settings.llm_provider` |
| Key fail-fast | validator vs lazy check | validator blocks boot (HARD) per spec | `model_validator(mode="after")` mirroring `jwt_secret` |
| Dormant Groq rows | rewrite vs route | rewrite only legacy default rows; custom rows route to active default at runtime | targeted migration + runtime fallback |
| temperature coalescing | `or` vs `is not None` | `or` drops `0` (current bug) | `is not None` |

## Data Flow

```
handler (evolution/telegram/meta)
  └─ agent.provider, agent.model, agent.temperature, agent.max_tokens
  └─ conversation_history (fetch LIMIT 30)
        ↓
  llm_client.generate(provider=agent.provider, model, max_tokens, temperature, history)
        ├─ resolve active: settings.llm_provider (openai|groq)
        ├─ if provider != active or model deprecated → warn + use active default
        ├─ trim history to settings.llm_history_token_budget (tokens≈len//3)
        ├─ build messages: [system+SECURITY_PROMPT, *history, user]
        └─ AsyncOpenAI(active key, active base_url).chat.completions.create(...)
             model=max_tokens/is-not-None, temperature/is-not-None
        ↓
  response text (RuntimeError on API failure)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `nc-api/app/core/config.py` | Modify | Add `llm_provider` (openai), `openai_api_key`, `openai_model=gpt-4o-mini`, `openai_temperature=0.7`, `openai_max_tokens=1024`, `openai_rate_limit_rpm=500`, `llm_history_token_budget=2000`, `DEFAULT_LLM_MODEL`; keep `groq_*` + `DEFAULT_GROQ_MODEL`/`DEPRECATED_GROQ_MODELS`; fail-fast validator |
| `nc-api/app/modules/integrations/llm/provider.py` | Modify | `GroqClient`→`LLMClient` (AsyncOpenAI), `groq_client`→`llm_client`, add `provider` param, active-resolution + deprecated fallback, token trim, `is not None` knobs, rate-tracker per active provider |
| `nc-api/pyproject.toml` | Modify | remove `groq>=1.2.0`, add `openai` |
| `nc-api/uv.lock` | Modify | regenerated (`uv lock`) |
| `nc-api/app/modules/agents/models.py` | Modify | ORM default `provider="openai"`, `model=DEFAULT_LLM_MODEL`; keep `temperature=0` default |
| `nc-api/app/modules/agents/schemas.py` | Modify | `SUPPORTED_PROVIDERS={"openai","groq"}`, `_AgentParams.provider="openai"`, `model=DEFAULT_LLM_MODEL` |
| `nc-api/app/api/v1/agents.py` | Modify | from-template → `provider="openai"`, `model=DEFAULT_LLM_MODEL` |
| `nc-api/app/modules/evolution/handler.py` | Modify | `groq_client`→`llm_client`, pass `provider=agent.provider`; history `.limit(30)` |
| `nc-api/app/modules/telegram/handler.py` | Modify | same rename + `provider`; `.limit(30)` |
| `nc-api/app/modules/integrations/webhook.py` | Modify | same rename + `provider`; wrap msg in `<user_query>`; `.limit(30)` |
| `nc-api/.env.example` | Modify | dual commentable blocks (openai_* / groq_*) + `LLM_PROVIDER` selector |
| `docker-compose.yml` | Modify | drop `:?` on `GROQ_API_KEY`; add `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_RATE_LIMIT_RPM` |
| `nc-api/app/db/migrations/versions/…_rewrite_legacy_agent_provider.py` | Create | revision `down_revision='d5e6f7a8b9c0'` |
| `nc-dashboard/lib/schemas/agent.ts` | Modify | `z.enum(["openai","groq"])`, defaults `openai`/`gpt-4o-mini`, prune `anthropic` |
| `nc-dashboard/app/dashboard/agents/components/agent-form.tsx` | Modify | provider/model UI + hidden inputs to active defaults |
| `nc-dashboard/app/dashboard/agents/[id]/page.tsx` | Modify | `provider: "openai"` in edit defaultValues |
| `nc-api/tests/conftest.py` | Modify | `setdefault("LLM_PROVIDER","openai")`, dummy `OPENAI_API_KEY` |

## Interfaces / Contracts

```python
# provider.py — signature preserved, provider added
class LLMClient:
    def __init__(self, api_key: str | None = None) -> None: ...
    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        *,
        conversation_history: list[dict[str, str]] | None = None,
        provider: str | None = None,   # NEW
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str: ...

llm_client = LLMClient()  # replaces groq_client
```

**Active-provider resolution** (in `generate`, evaluated per call): `active = settings.llm_provider`; `PROVIDER_BASE_URLS = {"openai": "https://api.openai.com/v1", "groq": "https://api.groq.com/openai/v1"}`. If `provider` is not None and `!= active` → `logger.warning(...)`, treat as active default. If `model in DEPRECATED_GROQ_MODELS` (only meaningful when `active=="groq"`) → warn + use active default. Effective `model`/`base_url` come from the **active** provider.

**Rate tracker:** `_track_rate_limit` reuses existing timestamp-window logic but reads the active provider's rpm (`openai_rate_limit_rpm=500` log-only; `groq_rate_limit_rpm=30`). Keep `max_tokens` default `1024`, `temperature` default `0.7` (fallback only when `None`). Use `temperature if temperature is not None else active_default` and `max_tokens if max_tokens is not None else active_default`.

**Config (config.py):**
```python
DEFAULT_LLM_MODEL: str = "gpt-4o-mini"
PROVIDER_BASE_URLS: dict[str, str] = {...}   # or local map in provider.py
# Settings fields
llm_provider: str = "openai"
openai_api_key: str = ""
openai_model: str = DEFAULT_LLM_MODEL
openai_temperature: float = 0.7
openai_max_tokens: int = DEFAULT_MAX_TOKENS
openai_rate_limit_rpm: int = 500
llm_history_token_budget: int = 2000

@model_validator(mode="after")
def require_active_provider_key(self) -> "Settings":
    if self.llm_provider not in {"openai", "groq"}:
        raise ValueError("LLM_PROVIDER must be one of: openai, groq")
    var = {"openai": "OPENAI_API_KEY", "groq": "GROQ_API_KEY"}[self.llm_provider]
    if not getattr(self, {"openai":"openai_api_key","groq":"groq_api_key"}[self.llm_provider]):
        raise ValueError(f"{var} es obligatorio cuando LLM_PROVIDER={self.llm_provider}")
    return self
```
Compatible with conftest: conftest `setdefault`s `LLM_PROVIDER=openai` + dummy `OPENAI_API_KEY` before app import, so boot passes; inactive `GROQ_API_KEY` not required.

## Migration Design

New revision `revision='c0d1e2f3a4b5'`, `down_revision='d5e6f7a8b9c0'`. Idempotent UPDATEs (alembic wraps in a txn, no explicit commit):

```sql
-- upgrade
UPDATE ai_agents SET provider='openai', model='gpt-4o-mini'
 WHERE provider='groq' AND model IN ('openai/gpt-oss-120b','openai/gpt-oss-20b');
-- custom groq rows (e.g. qwen/qwen3.6-27b) NOT matched → stay dormant
-- downgrade (approximate rollback, restores legacy default)
UPDATE ai_agents SET provider='groq', model='openai/gpt-oss-120b'
 WHERE provider='openai' AND model='gpt-4o-mini';
```
`DEPRECATED_GROQ_MODELS` values (llama-3.3-70b-versatile etc.) were already rewritten to `openai/gpt-oss-120b` by `b1c2d3e4f5a6`; since a row cannot hold a deprecated id *and* `provider='groq'` with a custom model, targeting `openai/gpt-oss-*` under `provider='groq'` is the correct legacy-default test. Post-upgrade `print` count via `rowcount` for observability. Tests assert: legacy rewritten, custom Groq untouched, idempotent.

## Slice Mapping (stacked-to-main, chained PRs)

| Slice | Scope (commit(s)) | Autonomy |
|---|---|---|
| **1 — Backend core** | `provider.py` rewrite (LLMClient + routing + `is not None` + rate tracker), `models.py`/`schemas.py`/`agents.py` defaults, handler renames + `provider=` arg + Meta `<user_query>`; runnable/testable | Independent: code compiles & all handler tests pass with OpenAI active + dummy key |
| **2 — Config/deploy + migration** | `config.py` (env/validator/token-budget/500rpm), `.env.example`, `docker-compose.yml`, new alembic revision | Independent: boot fail-fast verified; migration idempotent/reversible |
| **3 — Frontend + tests** | `nc-dashboard` (agent.ts schema, form, page), `conftest.py`, updated/new unit+handler tests, `pyproject.toml`+`uv.lock` (openai dep) | Independent: dashboard parity; full suite green |

Branch chain: `main → slice1 → slice2 → slice3`; each PR targets the previous branch (stacked). Each slice merges to `main` in order; no cross-slice diff bleed after rebase.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (provider) | routing fallback (provider mismatch, deprecated model), `is not None` knobs (temp 0 preserved / None→0.7), token trim, short history untouched | patch `llm_client._client` with `AsyncMock` (mirror `test_agent_model_migration.py`) |
| Unit (config) | invalid provider rejected; active-key fail-fast names exact var; OpenAI active w/o Groq key OK; `llm_history_token_budget=2000` | instantiate Settings / raise on boot |
| Migration | legacy rewritten, custom dormant, idempotent, downgrade | run migration SQL in `db_session` (pattern from `test_agent_model_migration.py`) |
| Handler/integration | renamed call sites pass `provider=agent.provider`; history `.limit(30)`; Meta `<user_query>`; evo/tg delimiter unchanged | patch `llm_client.generate`; assert kwargs + fetch limit |
| Dashboard | zod accepts openai+groq, defaults openai/gpt-4o-mini, `defaultAgentValues` parity | vitest (`agent.test.ts` style) |

## Rollback

1. **Code**: revert stack (slice3→slice1) → `main` to previous merge; re-deploy. `LLM_PROVIDER` env flip back to `groq` is the zero-code fallback if OpenAI key fails.
2. **Migration**: `alembic downgrade c0d1e2f3a4b5` restores `groq`/`openai/gpt-oss-120b` (approximate — also reverts new-default agents; acceptable per prior `b1c2d3e4f5a6` convention).
3. **Deploy**: if `OPENAI_API_KEY` missing/bad, API refuses to boot (intended); set `GROQ_API_KEY` + `LLM_PROVIDER=groq` to return to previous behavior.

## Open Questions

- None blocking. (Design assumes OpenAI `/v1` is the canonical `openai` base URL and that `openai_model` is `gpt-4o-mini` — per spec; if prod uses a different gpt model, only the constant/default changes.)