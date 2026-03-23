import { normalizeWorkspaceTitle } from "@/lib/workspaces/title";
import {
  createAgentWorkspace,
  getAgentWorkspaces,
} from "@/lib/supabase/agent-workspaces";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ workspaces: [] });
  }

  const workspaces = await getAgentWorkspaces(sessionId);
  return Response.json({ workspaces });
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    title?: string;
  };
  const workspace = await createAgentWorkspace({
    sessionId,
    title: normalizeWorkspaceTitle(payload.title),
  });

  if (!workspace) {
    return Response.json(
      { error: "Failed to create workspace" },
      { status: 500 },
    );
  }

  return Response.json({
    workspace: {
      created_at: workspace.created_at,
      id: workspace.id,
      title: workspace.title,
      updated_at: workspace.updated_at,
    },
  });
}
