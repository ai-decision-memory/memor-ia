import {
  buildChatTitleFromMessages,
  DEFAULT_CHAT_TITLE,
  normalizeChatTitle,
} from "@/lib/chats/title";
import { getAgentWorkspace } from "@/lib/supabase/agent-workspaces";
import { createAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import type { UIMessage } from "ai";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ chats: [] });
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return Response.json({ chats: [] });
  }

  const chats = await getAgentChats({
    sessionId,
    workspaceId,
  });
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
    workspaceId?: string;
  };
  const workspaceId =
    typeof payload.workspaceId === "string" ? payload.workspaceId : "";
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!workspaceId) {
    return Response.json({ error: "Workspace not found" }, { status: 400 });
  }

  const workspace = await getAgentWorkspace({
    sessionId,
    workspaceId,
  });

  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

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
    workspaceId: workspace.id,
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
