# AI Agent Model Specification

## Purpose

Agent-level provider/model defaults and validation across the backend schemas/ORM, the dashboard zod schema, and a targeted data migration that rewrites legacy default-model rows to the new OpenAI default while leaving custom Groq rows dormant. Specified as a full spec — no prior spec exists.

## Requirements

### Requirement: Backend agent defaults and validation

The system MUST default new agents to `provider=openai`, `model=gpt-4o-mini` at the ORM column default, the create/update schema (`_AgentParams`), and the `from-template` endpoint (`agents.py`). `SUPPORTED_PROVIDERS` MUST become `{"openai", "groq"}`, and the provider validator MUST accept both and list both in its error message.

#### Scenario: New agent defaults to OpenAI

- GIVEN a user creates an agent without provider/model
- WHEN the agent is persisted
- THEN it stores `provider=openai` and `model=gpt-4o-mini`

#### Scenario: Groq provider accepted

- GIVEN a user submits `provider="groq"` with a Groq model
- WHEN the agent is created
- THEN validation passes (422 only for providers outside `{"openai","groq"}`)

#### Scenario: From-template uses canonical defaults

- GIVEN an agent is created from a template without provider/model overrides
- WHEN the template endpoint runs
- THEN it uses the canonical `openai`/`gpt-4o-mini` defaults (not the old `groq`/`openai/gpt-oss-120b` hardcode)

#### Scenario: Unsupported provider rejected

- GIVEN a user submits `provider="anthropic"`
- WHEN the agent is created
- THEN a 422 is returned listing the supported providers

### Requirement: Dashboard schema sync

The system MUST update `nc-dashboard/lib/schemas/agent.ts` so the `provider` enum accepts both `openai` and `groq`, and `defaultAgentValues` defaults to `provider=openai`, `model=gpt-4o-mini`, keeping the Groq option available.

#### Scenario: Dashboard accepts both providers

- GIVEN the dashboard agent form
- WHEN a user selects `provider`
- THEN both `openai` and `groq` are valid and the form defaults to `openai`/`gpt-4o-mini`

### Requirement: Targeted data migration

The system MUST add an alembic revision (child of chain head `d5e6f7a8b9c0`) that rewrites rows storing the old default (`provider='groq'` with `model='openai/gpt-oss-120b'` or a deprecated id) to `provider='openai', model='gpt-4o-mini'`. Rows with a genuinely custom Groq model MUST be left untouched (dormant). The migration MUST be idempotent and provide a reverse (downgrade) restoring `groq`/`openai/gpt-oss-120b`.

#### Scenario: Legacy default rows rewritten

- GIVEN a row stores `provider='groq'`, `model='openai/gpt-oss-120b'`
- WHEN the migration runs
- THEN the row becomes `provider='openai'`, `model='gpt-4o-mini'`

#### Scenario: Custom Groq rows stay dormant

- GIVEN a row stores `provider='groq'`, `model='qwen/qwen3.6-27b'`
- WHEN the migration runs
- THEN the row is untouched (still `groq`); at runtime it routes to the active OpenAI default with a warning

#### Scenario: Idempotent migration

- GIVEN the migration has already run once
- WHEN it runs again
- THEN it makes no additional changes

### Requirement: Dormant-row runtime behavior

The system MUST route any remaining `provider='groq'` custom-model row to the active OpenAI default at runtime with a per-message warning (no data loss, no invalid Groq model id sent to OpenAI).

#### Scenario: Dormant row served safely

- GIVEN `LLM_PROVIDER=openai` and an untouched custom Groq row
- WHEN that agent responds
- THEN it uses the OpenAI default model and logs a routing warning