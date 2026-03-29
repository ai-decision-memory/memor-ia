import "server-only";
import type { ChatUIMessage } from "@/lib/chat-messages";
import { supabaseRequest } from "@/lib/supabase/rest";

const AGENT_CHATS_TABLE = "agent_chats";

export type AgentChatRecord = {
  id: string;
  session_id: string;
  workspace_id: string;
  title: string;
  messages: ChatUIMessage[];
  created_at: string;
  updated_at: string;
};

export type AgentChatListItem = Pick<
  AgentChatRecord,
  "id" | "title" | "created_at" | "updated_at"
>;

export async function getAgentChats({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId?: string;
}) {
  return await supabaseRequest<AgentChatListItem[]>({
    method: "GET",
    searchParams: {
      select: "id,title,created_at,updated_at",
      session_id: `eq.${sessionId}`,
      ...(workspaceId ? { workspace_id: `eq.${workspaceId}` } : {}),
      order: "updated_at.desc",
    },
    tableName: AGENT_CHATS_TABLE,
  });
}

export async function getAgentChat({
  chatId,
  sessionId,
}: {
  chatId: string;
  sessionId: string;
}) {
  const chats = await supabaseRequest<AgentChatRecord[]>({
    method: "GET",
    searchParams: {
      select: "*",
      id: `eq.${chatId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_CHATS_TABLE,
  });

  return chats[0] ?? null;
}

export async function createAgentChat({
  messages = [],
  sessionId,
  title,
  workspaceId,
}: {
  messages?: ChatUIMessage[];
  sessionId: string;
  title: string;
  workspaceId: string;
}) {
  const chats = await supabaseRequest<AgentChatRecord[]>({
    body: {
      messages,
      session_id: sessionId,
      title,
      workspace_id: workspaceId,
    },
    method: "POST",
    prefer: "return=representation",
    tableName: AGENT_CHATS_TABLE,
  });

  return chats[0] ?? null;
}

export async function updateAgentChatMessages({
  chatId,
  messages,
  sessionId,
}: {
  chatId: string;
  messages: ChatUIMessage[];
  sessionId: string;
}) {
  const chats = await supabaseRequest<AgentChatRecord[]>({
    body: {
      messages,
    },
    method: "PATCH",
    prefer: "return=representation",
    searchParams: {
      id: `eq.${chatId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_CHATS_TABLE,
  });

  return chats[0] ?? null;
}

export async function updateAgentChatTitle({
  chatId,
  sessionId,
  title,
}: {
  chatId: string;
  sessionId: string;
  title: string;
}) {
  const chats = await supabaseRequest<AgentChatRecord[]>({
    body: {
      title,
    },
    method: "PATCH",
    prefer: "return=representation",
    searchParams: {
      id: `eq.${chatId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_CHATS_TABLE,
  });

  return chats[0] ?? null;
}

export async function deleteAgentChat({
  chatId,
  sessionId,
}: {
  chatId: string;
  sessionId: string;
}) {
  await supabaseRequest<null>({
    method: "DELETE",
    prefer: "return=minimal",
    searchParams: {
      id: `eq.${chatId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_CHATS_TABLE,
  });
}
