import {
  normalizeChatGroupName,
  normalizeChatTitle,
} from "@/lib/chats/title";
import {
  deleteAgentChat,
  getAgentChat,
  updateAgentChat,
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
  const payload = ((await request.json()) ?? {}) as {
    groupName?: string | null;
    title?: string;
  };

  const nextTitle = Object.prototype.hasOwnProperty.call(payload, "title")
    ? normalizeChatTitle(payload.title)
    : undefined;
  const nextGroupName = Object.prototype.hasOwnProperty.call(payload, "groupName")
    ? normalizeChatGroupName(payload.groupName)
    : undefined;

  if (nextTitle === undefined && nextGroupName === undefined) {
    return Response.json({ error: "No chat updates provided" }, { status: 400 });
  }

  const updatedChat = await updateAgentChat({
    chatId,
    groupName: nextGroupName,
    sessionId,
    title: nextTitle,
  });

  if (!updatedChat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({
    chat: {
      created_at: updatedChat.created_at,
      group_name: updatedChat.group_name,
      id: updatedChat.id,
      title: updatedChat.title,
      updated_at: updatedChat.updated_at,
    },
  });
}
