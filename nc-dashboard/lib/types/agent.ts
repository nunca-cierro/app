/* ------------------------------------------------------------------ */
/*  AiAgent — 1:1 con AiAgentResponse del backend                       */
/* ------------------------------------------------------------------ */

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Prompt — 1:1 con PromptResponse del backend                         */
/* ------------------------------------------------------------------ */

export interface Prompt {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  type: string;
  version: number;
  content: string;
  active: boolean;
  created_at: string;
}
