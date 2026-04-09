import {
  buildChatTitleFromMessages,
  DEFAULT_CHAT_TITLE,
  normalizeChatGroupName,
  normalizeChatTitle,
} from "@/lib/chats/title";
import type { ChatUIMessage } from "@/lib/chat-messages";
import { ensureAgentWorkspace } from "@/lib/supabase/agent-workspaces";
import { createAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ chats: [] });
  }

  const chats = await getAgentChats({ sessionId });
  return Response.json({ chats });
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const payload = ((await request.json()) ?? {}) as {
    groupName?: string | null;
    messages?: ChatUIMessage[];
    title?: string;
  };
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  const [workspace] = await ensureAgentWorkspace(sessionId);

  if (!workspace) {
    return Response.json({ error: "Failed to initialize chat scope" }, { status: 500 });
  }

  const title = normalizeChatTitle(
    typeof payload.title === "string" && payload.title.trim() !== ""
      ? payload.title
      : messages.length > 0
        ? buildChatTitleFromMessages(messages)
        : DEFAULT_CHAT_TITLE,
  );
  const chat = await createAgentChat({
    groupName: normalizeChatGroupName(payload.groupName),
    messages,
    sessionId,
    title,
    workspaceId: workspace.id,
  });

  if (!chat) {
    return Response.json({ error: "Failed to create chat" }, { status: 500 });
  }

  return Response.json({
    chat: {
      created_at: chat.created_at,
      group_name: chat.group_name,
      id: chat.id,
      title: chat.title,
      updated_at: chat.updated_at,
    },
  });
}
