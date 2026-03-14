import { DEFAULT_CHAT_TITLE } from "@/lib/chats/title";
import { createAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
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

  await request.json();
  const title = DEFAULT_CHAT_TITLE;
  const chat = await createAgentChat({
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
