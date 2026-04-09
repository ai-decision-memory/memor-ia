import { buildMarkdownFromChatMessages } from "@/lib/chats/markdown-export";
import { normalizeDocTitle } from "@/lib/docs/title";
import { AGENT_DOC_KINDS, type AgentDocKind } from "@/lib/docs/types";
import { createAgentDoc } from "@/lib/supabase/agent-docs";
import { getAgentChat } from "@/lib/supabase/agent-chats";
import { NextRequest } from "next/server";

function isAgentDocKind(value: unknown): value is AgentDocKind {
  return typeof value === "string" && (AGENT_DOC_KINDS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const body = (await request.json()) as {
    chatId?: unknown;
    kind?: unknown;
    title?: unknown;
  };

  if (typeof body.chatId !== "string" || body.chatId.trim() === "") {
    return Response.json({ error: "chatId is required" }, { status: 400 });
  }

  const chat = await getAgentChat({
    chatId: body.chatId,
    sessionId,
  });

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const content = buildMarkdownFromChatMessages(chat.messages);

  if (content === "") {
    return Response.json(
      { error: "This chat has no text messages to save as a document" },
      { status: 400 },
    );
  }

  const kind: AgentDocKind = isAgentDocKind(body.kind) ? body.kind : "technical";
  const title = normalizeDocTitle(
    typeof body.title === "string" && body.title.trim() !== ""
      ? body.title
      : chat.title,
  );

  const doc = await createAgentDoc({
    citations: [],
    content,
    kind,
    sessionId,
    sourceChatId: chat.id,
    title,
    workspaceId: chat.workspace_id,
  });

  if (!doc) {
    return Response.json({ error: "Failed to create document" }, { status: 500 });
  }

  return Response.json({ doc });
}
