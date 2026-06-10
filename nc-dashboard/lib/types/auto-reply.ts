/* ------------------------------------------------------------------ */
/*  AutoReply — 1:1 con AutoReplyResponse del backend                   */
/* ------------------------------------------------------------------ */

export interface AutoReply {
  id: string;
  tenant_id: string;
  keywords: string[];
  match_type: "any" | "all" | "exact";
  response_text: string;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutoReplyCreate {
  tenant_id: string;
  keywords: string[];
  match_type: "any" | "all" | "exact";
  response_text: string;
  enabled?: boolean;
  priority?: number;
}

export interface AutoReplyUpdate {
  keywords?: string[];
  match_type?: "any" | "all" | "exact";
  response_text?: string;
  enabled?: boolean;
  priority?: number;
}
