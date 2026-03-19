import {
  buildChatTitleFromMessages,
  DEFAULT_CHAT_TITLE,
  normalizeChatTitle,
} from "@/lib/chats/title";
import { createAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import type { UIMessage } from "ai";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ chats: [] });
  }

  const chats = await getAgentChats(sessionId);
  return Response.json({ chats });
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    messages?: UIMessage[];
    title?: string;
  };
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const title = normalizeChatTitle(
    typeof payload.title === "string" && payload.title.trim() !== ""
      ? payload.title
      : messages.length > 0
        ? buildChatTitleFromMessages(messages)
        : DEFAULT_CHAT_TITLE,
  );
  const chat = await createAgentChat({
    messages,
    sessionId,
    title,
  });

  if (!chat) {
    return Response.json({ error: "Failed to create chat" }, { status: 500 });
  }

  return Response.json({
    chat: {
      created_at: chat.created_at,
      id: chat.id,
      title: chat.title,
      updated_at: chat.updated_at,
    },
  });
}
