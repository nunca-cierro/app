# LLM Configuration Specification

## Purpose

Application-level selection and validation of the active LLM provider (OpenAI default, Groq optional) via environment. Defines provider blocks, canonical defaults, fail-fast key validation, base URLs, and token-budget setting. Specified as a full spec — no prior spec exists.

## Requirements

### Requirement: Provider selection

The system MUST support exactly two providers via a single `LLM_PROVIDER` setting: `openai` (default) and `groq`. Each provider MUST have its own env block (`openai_*` / `groq_*`) and its own entry in the provider base-URL map: `openai` → `https://api.openai.com/v1`, `groq` → `https://api.groq.com/openai/v1`.

| Strength | Keyword |
|---|---|
| Selection | MUST support `openai` (default) and `groq` |
| Defaults | `DEFAULT_PROVIDER=openai`, `DEFAULT_LLM_MODEL=gpt-4o-mini`; `DEFAULT_GROQ_MODEL` and `DEPRECATED_GROQ_MODELS` retained for the Groq block |
| Defaults | LLM `temperature` default stays `0.7`; `max_tokens` stays `1024` |

#### Scenario: OpenAI is the active default

- GIVEN `LLM_PROVIDER` is unset (or `openai`)
- WHEN settings are loaded
- THEN the active provider resolves to `openai` with default model `gpt-4o-mini` and base URL `https://api.openai.com/v1`

#### Scenario: Groq selected via env

- GIVEN `.env` sets `LLM_PROVIDER=groq` and the Groq block
- WHEN settings are loaded
- THEN the active provider resolves to `groq` with `https://api.groq.com/openai/v1`

#### Scenario: Invalid provider rejected

- GIVEN `LLM_PROVIDER` is set to an unsupported value (e.g. `anthropic`)
- WHEN settings are loaded
- THEN settings load fails with a validation error listing the allowed providers

### Requirement: Dual commentable env blocks

The `.env.example` MUST present two clearly separated, commentable provider blocks (`openai_*` and `groq_*`) with a single `LLM_PROVIDER` selector and a comment instructing the operator to uncomment one block. `docker-compose.yml` MUST NOT hard-require `GROQ_API_KEY`; it MUST pass both blocks with defaults (`${LLM_PROVIDER:-openai}`, `${OPENAI_API_KEY:-}`, `${GROQ_API_KEY:-}`) and require only the active provider's key.

#### Scenario: Deploy with OpenAI active

- GIVEN the host `.env` sets `LLM_PROVIDER=openai` with the OpenAI block and no Groq key
- WHEN `docker-compose up` runs
- THEN the API boots without requiring `GROQ_API_KEY`

#### Scenario: Real key is a deploy secret

- GIVEN the OpenAI block is uncommented in `.env.production`
- WHEN the operator pastes the real `OPENAI_API_KEY` on the server (never committed)
- THEN the key is used at runtime and no placeholder/real key is committed to the repo

### Requirement: Fail-fast on missing active provider key

The system MUST refuse to boot (raise at settings load) when the ACTIVE provider's API key is empty. The error MUST name the exact env var (`OPENAI_API_KEY` or `GROQ_API_KEY`). The inactive provider's key MUST NOT be required.

#### Scenario: OpenAI active with missing key

- GIVEN `LLM_PROVIDER=openai` and `OPENAI_API_KEY` empty
- WHEN settings are instantiated
- THEN boot fails with an error naming `OPENAI_API_KEY`

#### Scenario: Groq active with missing key

- GIVEN `LLM_PROVIDER=groq` and `GROQ_API_KEY` empty
- WHEN settings are instantiated
- THEN boot fails with an error naming `GROQ_API_KEY`

#### Scenario: Tests inject dummy keys

- GIVEN tests run without real keys
- WHEN `conftest.py` sets `LLM_PROVIDER=openai` and a dummy `OPENAI_API_KEY` via `setdefault` before app imports
- THEN the API boots and all tests execute without contacting a real provider

### Requirement: Token-budget setting

The system MUST expose `llm_history_token_budget` (default `2000`) used to trim conversation history before calling the provider. Token estimation MUST use the deterministic approximation `tokens ≈ len(text) // 3` with no tiktoken dependency.

#### Scenario: Default budget applied

- GIVEN no override
- WHEN settings are loaded
- THEN `llm_history_token_budget` equals `2000`

### Requirement: OpenAI rate-tracker default

The system MUST default the OpenAI rate-limit RPM to `500` (log-only; never blocks).

#### Scenario: OpenAI RPM default

- GIVEN `LLM_PROVIDER=openai` and no `openai_rate_limit_rpm` override
- WHEN settings are loaded
- THEN the OpenAI RPM is `500` and is used only for log diagnostics