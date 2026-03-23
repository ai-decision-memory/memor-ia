import { normalizePinnedPromptTitle } from "@/lib/pinned-prompts/title";
import { getAgentWorkspace } from "@/lib/supabase/agent-workspaces";
import {
  createAgentPinnedPrompt,
  getAgentPinnedPrompts,
} from "@/lib/supabase/agent-pinned-prompts";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ prompts: [] });
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return Response.json({ prompts: [] });
  }

  const prompts = await getAgentPinnedPrompts({
    sessionId,
    workspaceId,
  });

  return Response.json({ prompts });
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    prompt?: string;
    title?: string;
    workspaceId?: string;
  };
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!payload.workspaceId) {
    return Response.json({ error: "Workspace not found" }, { status: 400 });
  }

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const workspace = await getAgentWorkspace({
    sessionId,
    workspaceId: payload.workspaceId,
  });

  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  const createdPrompt = await createAgentPinnedPrompt({
    prompt,
    sessionId,
    title: normalizePinnedPromptTitle(payload.title),
    workspaceId: workspace.id,
  });

  if (!createdPrompt) {
    return Response.json(
      { error: "Failed to create pinned prompt" },
      { status: 500 },
    );
  }

  return Response.json({
    prompt: {
      created_at: createdPrompt.created_at,
      id: createdPrompt.id,
      prompt: createdPrompt.prompt,
      title: createdPrompt.title,
      updated_at: createdPrompt.updated_at,
      workspace_id: createdPrompt.workspace_id,
    },
  });
}
