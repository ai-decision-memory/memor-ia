import "server-only";
import { supabaseRequest } from "@/lib/supabase/rest";
import type {
  AgentPinnedPromptRecord,
  AgentPinnedPromptSummary,
} from "@/lib/pinned-prompts/types";

const AGENT_PINNED_PROMPTS_TABLE = "agent_pinned_prompts";

export async function getAgentPinnedPrompts({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId: string;
}) {
  return await supabaseRequest<AgentPinnedPromptSummary[]>({
    method: "GET",
    searchParams: {
      order: "updated_at.desc",
      select: "id,title,prompt,workspace_id,created_at,updated_at",
      session_id: `eq.${sessionId}`,
      workspace_id: `eq.${workspaceId}`,
    },
    tableName: AGENT_PINNED_PROMPTS_TABLE,
  });
}

export async function getAgentPinnedPrompt({
  promptId,
  sessionId,
}: {
  promptId: string;
  sessionId: string;
}) {
  const prompts = await supabaseRequest<AgentPinnedPromptRecord[]>({
    method: "GET",
    searchParams: {
      id: `eq.${promptId}`,
      select: "*",
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_PINNED_PROMPTS_TABLE,
  });

  return prompts[0] ?? null;
}

export async function createAgentPinnedPrompt({
  prompt,
  sessionId,
  title,
  workspaceId,
}: {
  prompt: string;
  sessionId: string;
  title: string;
  workspaceId: string;
}) {
  const prompts = await supabaseRequest<AgentPinnedPromptRecord[]>({
    body: {
      prompt,
      session_id: sessionId,
      title,
      workspace_id: workspaceId,
    },
    method: "POST",
    prefer: "return=representation",
    tableName: AGENT_PINNED_PROMPTS_TABLE,
  });

  return prompts[0] ?? null;
}

export async function updateAgentPinnedPrompt({
  prompt,
  promptId,
  sessionId,
  title,
}: {
  prompt: string;
  promptId: string;
  sessionId: string;
  title: string;
}) {
  const prompts = await supabaseRequest<AgentPinnedPromptRecord[]>({
    body: {
      prompt,
      title,
    },
    method: "PATCH",
    prefer: "return=representation",
    searchParams: {
      id: `eq.${promptId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_PINNED_PROMPTS_TABLE,
  });

  return prompts[0] ?? null;
}

export async function deleteAgentPinnedPrompt({
  promptId,
  sessionId,
}: {
  promptId: string;
  sessionId: string;
}) {
  await supabaseRequest<null>({
    method: "DELETE",
    prefer: "return=minimal",
    searchParams: {
      id: `eq.${promptId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_PINNED_PROMPTS_TABLE,
  });
}
