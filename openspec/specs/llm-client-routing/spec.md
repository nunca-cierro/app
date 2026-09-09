# LLM Client Routing Specification

## Purpose

Unified `LLMClient` built on the OpenAI SDK (`AsyncOpenAI`) that routes generation to the active provider, enforces provider/model fallback rules, uses None-aware temperature/max_tokens, trims history to a token budget, and delimits user input. Specified as a full spec — no prior spec exists.

## Requirements

### Requirement: Unified client on OpenAI SDK

The system MUST replace `GroqClient`/`groq_client` with `LLMClient`/`llm_client` backed by `AsyncOpenAI(api_key=<active key>, base_url=<active base_url>)`. The `groq` pip dependency MUST be removed and `openai` added. `generate()` MUST keep its existing signature and add a `provider: str | None = None` parameter.

#### Scenario: OpenAI-active client construction

- GIVEN `LLM_PROVIDER=openai`
- WHEN `LLMClient` is instantiated
- THEN it uses `AsyncOpenAI` with the OpenAI key and `https://api.openai.com/v1`

#### Scenario: Groq-active client construction

- GIVEN `LLM_PROVIDER=groq`
- WHEN `LLMClient` is instantiated
- THEN it uses `AsyncOpenAI` with the Groq key and `https://api.groq.com/openai/v1`

#### Scenario: Call sites renamed

- GIVEN the three handlers (`evolution`, `telegram`, `integrations/webhook`) previously called `groq_client`
- WHEN they are updated
- THEN they call `llm_client` and pass `provider=agent.provider`

### Requirement: Provider/model fallback routing

The system MUST route a generation to the active provider's default model when the requested `provider` does not match the active `LLM_PROVIDER`, or when the requested `model` is deprecated — logging a warning in both cases. A stored model MUST be passed through only when it belongs to the active provider.

#### Scenario: Provider mismatch falls back to active default

- GIVEN `agent.provider=groq` (dormant custom row) while `LLM_PROVIDER=openai`
- WHEN `generate(provider="groq", model="qwen/qwen3.6-27b")` is called
- THEN the request uses the active OpenAI default model and a warning is logged

#### Scenario: Deprecated model falls back to default

- GIVEN an agent stores a deprecated Groq model id
- WHEN it is generated while Groq is active
- THEN it is routed to the Groq default model and a warning is logged

#### Scenario: Matching provider/model passes through

- GIVEN `agent.provider=openai` and `agent.model=gpt-4o-mini` while `LLM_PROVIDER=openai`
- WHEN `generate()` is called
- THEN the stored model `gpt-4o-mini` is sent unchanged with no warning

### Requirement: None-aware completion knobs

The system MUST honor a stored `temperature=0` and `max_tokens` exactly when provided, using `is not None` semantics rather than falsy coalescing. The settings defaults MUST remain `temperature=0.7` and `max_tokens=1024` for fallback when the value is `None`.

#### Scenario: Stored temperature 0 is preserved

- GIVEN `temperature=0` is passed (the agent default)
- WHEN `generate()` runs
- THEN the API receives `temperature=0` (not `0.7`)

#### Scenario: Temperature fallback when unset

- GIVEN `temperature=None` is passed
- WHEN `generate()` runs
- THEN the API receives the settings default `0.7`

### Requirement: Token-budget history trimming

`generate()` MUST trim `conversation_history` to the `llm_history_token_budget` by dropping the OLDEST messages while the approximate token count exceeds the budget, using `tokens ≈ len(text) // 3`. Handlers MUST raise the history fetch from `LIMIT 10` to `LIMIT 30` so trimming keeps real context.

#### Scenario: History trimmed to budget

- GIVEN a long conversation exceeds `llm_history_token_budget`
- WHEN `generate()` is called
- THEN the oldest messages are dropped and the remaining history fits the budget

#### Scenario: Short history untouched

- GIVEN a short conversation fits the budget
- WHEN `generate()` is called
- THEN the full history is passed without trimming

#### Scenario: Fetch window raised

- GIVEN a conversation with up to 30 messages
- WHEN a handler loads history
- THEN up to 30 messages are fetched (was 10)

### Requirement: User-query delimiting on Meta path

The system MUST wrap the incoming user message in `<user_query>\n…\n</user_query>` delimiters in the Meta Cloud API handler (`integrations/webhook.py`) only — the Evolution and Telegram handlers already do this and MUST NOT be changed for delimiting.

#### Scenario: Meta message is delimited

- GIVEN a WhatsApp message arrives via `POST /webhook/whatsapp/{connection_id}`
- WHEN `generate()` is called from the Meta path
- THEN the `user_message` is wrapped in `<user_query>` tags

#### Scenario: Evolution and Telegram delimiters unchanged

- GIVEN an Evolution or Telegram message is generated
- WHEN the handler calls `generate()`
- THEN the existing `<user_query>` wrapping is preserved (no regression)