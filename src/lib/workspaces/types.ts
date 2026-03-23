export type AgentWorkspaceRecord = {
  created_at: string;
  id: string;
  session_id: string;
  title: string;
  updated_at: string;
};

export type AgentWorkspaceSummary = Pick<
  AgentWorkspaceRecord,
  "created_at" | "id" | "title" | "updated_at"
>;
