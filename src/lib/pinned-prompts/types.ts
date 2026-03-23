export type AgentPinnedPromptRecord = {
  created_at: string;
  id: string;
  prompt: string;
  session_id: string;
  title: string;
  updated_at: string;
  workspace_id: string;
};

export type AgentPinnedPromptSummary = Pick<
  AgentPinnedPromptRecord,
  "created_at" | "id" | "prompt" | "title" | "updated_at" | "workspace_id"
>;
