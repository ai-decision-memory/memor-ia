import { normalizeChatTitle } from "@/lib/chats/title";
import {
  deleteAgentChat,
  getAgentChat,
  updateAgentChatTitle,
} from "@/lib/supabase/agent-chats";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    chatId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { chatId } = await context.params;
  const chat = await getAgentChat({
    chatId,
    sessionId,
  });

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({ chat });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { chatId } = await context.params;
  await deleteAgentChat({
    chatId,
    sessionId,
  });

  return new Response(null, { status: 204 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { chatId } = await context.params;
  const { title }: { title?: string } = await request.json();
  const updatedChat = await updateAgentChatTitle({
    chatId,
    sessionId,
    title: normalizeChatTitle(title),
  });

  if (!updatedChat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({
    chat: {
      created_at: updatedChat.created_at,
      id: updatedChat.id,
      title: updatedChat.title,
      updated_at: updatedChat.updated_at,
    },
  });
}
