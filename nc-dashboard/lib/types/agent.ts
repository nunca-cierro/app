/* ------------------------------------------------------------------ */
/*  Business config — structured info for the AI agent                  */
/* ------------------------------------------------------------------ */

export interface BusinessConfig {
  /** Instrucciones de comportamiento para el bot */
  instructions?: string;
  business_info?: {
    name?: string;
    description?: string;
    schedule?: string;
    location?: string;
    phone?: string;
    website?: string;
    social?: string;
  };
  products_services?: Array<{
    name: string;
    price: string;
    duration: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  tone?: string;
  keywords_to_escalate?: string[];
  fallback_message?: string;
}

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
  business_config: BusinessConfig | null;
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

/* ------------------------------------------------------------------ */
/*  AgentTemplate — 1:1 con AgentTemplateResponse del backend           */
/* ------------------------------------------------------------------ */

export interface AgentTemplate {
  id: string;
  category: string;
  name: string;
  description: string | null;
  content: BusinessConfig;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
