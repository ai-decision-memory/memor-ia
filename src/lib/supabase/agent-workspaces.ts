import "server-only";
import { DEFAULT_WORKSPACE_TITLE, normalizeWorkspaceTitle } from "@/lib/workspaces/title";
import type {
  AgentWorkspaceRecord,
  AgentWorkspaceSummary,
} from "@/lib/workspaces/types";
import { supabaseRequest } from "@/lib/supabase/rest";

const AGENT_WORKSPACES_TABLE = "agent_workspaces";

export async function getAgentWorkspaces(sessionId: string) {
  return await supabaseRequest<AgentWorkspaceSummary[]>({
    method: "GET",
    searchParams: {
      order: "updated_at.desc",
      select: "id,title,created_at,updated_at",
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_WORKSPACES_TABLE,
  });
}

export async function getAgentWorkspace({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId: string;
}) {
  const workspaces = await supabaseRequest<AgentWorkspaceRecord[]>({
    method: "GET",
    searchParams: {
      id: `eq.${workspaceId}`,
      select: "*",
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_WORKSPACES_TABLE,
  });

  return workspaces[0] ?? null;
}

export async function createAgentWorkspace({
  sessionId,
  title,
}: {
  sessionId: string;
  title?: string;
}) {
  const workspaces = await supabaseRequest<AgentWorkspaceRecord[]>({
    body: {
      session_id: sessionId,
      title: normalizeWorkspaceTitle(title),
    },
    method: "POST",
    prefer: "return=representation",
    tableName: AGENT_WORKSPACES_TABLE,
  });

  return workspaces[0] ?? null;
}

export async function ensureAgentWorkspace(sessionId: string) {
  const existingWorkspaces = await getAgentWorkspaces(sessionId);

  if (existingWorkspaces.length > 0) {
    return existingWorkspaces;
  }

  const workspace = await createAgentWorkspace({
    sessionId,
    title: DEFAULT_WORKSPACE_TITLE,
  });

  return workspace
    ? [
        {
          created_at: workspace.created_at,
          id: workspace.id,
          title: workspace.title,
          updated_at: workspace.updated_at,
        },
      ]
    : [];
}
