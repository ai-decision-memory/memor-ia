export const AGENT_DOC_KINDS = ["technical", "user-facing"] as const;

export type AgentDocKind = (typeof AGENT_DOC_KINDS)[number];

export type AgentDocSummary = {
  created_at: string;
  id: string;
  kind: AgentDocKind;
  title: string;
  updated_at: string;
};

export type AgentDocRecord = AgentDocSummary & {
  content: string;
  session_id: string;
  source_chat_id: string | null;
  workspace_id: string;
};

export type DocGenerationClarification = {
  answer: string;
  question: string;
};
