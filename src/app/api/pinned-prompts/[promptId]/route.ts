import { normalizePinnedPromptTitle } from "@/lib/pinned-prompts/title";
import {
  deleteAgentPinnedPrompt,
  getAgentPinnedPrompt,
  updateAgentPinnedPrompt,
} from "@/lib/supabase/agent-pinned-prompts";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    promptId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { promptId } = await context.params;
  const payload = (await request.json()) as {
    prompt?: string;
    title?: string;
  };
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const updatedPrompt = await updateAgentPinnedPrompt({
    prompt,
    promptId,
    sessionId,
    title: normalizePinnedPromptTitle(payload.title),
  });

  if (!updatedPrompt) {
    return Response.json({ error: "Pinned prompt not found" }, { status: 404 });
  }

  return Response.json({
    prompt: {
      created_at: updatedPrompt.created_at,
      id: updatedPrompt.id,
      prompt: updatedPrompt.prompt,
      title: updatedPrompt.title,
      updated_at: updatedPrompt.updated_at,
      workspace_id: updatedPrompt.workspace_id,
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { promptId } = await context.params;
  const prompt = await getAgentPinnedPrompt({
    promptId,
    sessionId,
  });

  if (!prompt) {
    return Response.json({ error: "Pinned prompt not found" }, { status: 404 });
  }

  await deleteAgentPinnedPrompt({
    promptId,
    sessionId,
  });

  return new Response(null, { status: 204 });
}
