import {
  buildDocsGenerationPrompt,
  DOC_GENERATION_SYSTEM_PROMPT,
  parseDocGenerationDecision,
} from "@/lib/docs/generation";
import { normalizeDocTitle } from "@/lib/docs/title";
import type { DocGenerationClarification } from "@/lib/docs/types";
import { getAgentChat } from "@/lib/supabase/agent-chats";
import { createAgentDoc } from "@/lib/supabase/agent-docs";
import { openai } from "@ai-sdk/openai";
import { generateText, type UIMessage } from "ai";
import { NextRequest } from "next/server";

const TEMP_CHAT_ID_PREFIX = "temp-chat-";

function sanitizeClarifications(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as DocGenerationClarification[];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const clarification = item as Record<string, unknown>;
      const question =
        typeof clarification.question === "string"
          ? clarification.question.trim()
          : "";
      const answer =
        typeof clarification.answer === "string"
          ? clarification.answer.trim()
          : "";

      if (!question || !answer) {
        return null;
      }

      return {
        answer,
        question,
      };
    })
    .filter((value): value is DocGenerationClarification => Boolean(value));
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    chatId?: string | null;
    clarifications?: unknown;
    messages?: UIMessage[];
  };
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (messages.length === 0) {
    return Response.json(
      { error: "A conversation is required to generate docs" },
      { status: 400 },
    );
  }

  let sourceChatId: string | null = null;

  if (payload.chatId && !payload.chatId.startsWith(TEMP_CHAT_ID_PREFIX)) {
    const chat = await getAgentChat({
      chatId: payload.chatId,
      sessionId,
    });

    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    sourceChatId = chat.id;
  }

  const clarifications = sanitizeClarifications(payload.clarifications);
  const result = await generateText({
    model: openai("gpt-4o"),
    prompt: buildDocsGenerationPrompt({
      clarifications,
      messages,
    }),
    system: DOC_GENERATION_SYSTEM_PROMPT,
  });
  const decision = parseDocGenerationDecision(result.text);

  if (decision.status === "needs_clarification") {
    return Response.json({
      question: decision.question,
      status: "needs_clarification",
    });
  }

  const doc = await createAgentDoc({
    content: decision.markdown,
    kind: decision.kind,
    sessionId,
    sourceChatId,
    title: normalizeDocTitle(decision.title),
  });

  if (!doc) {
    return Response.json({ error: "Failed to create doc" }, { status: 500 });
  }

  return Response.json({
    doc: {
      created_at: doc.created_at,
      id: doc.id,
      kind: doc.kind,
      source_chat_id: doc.source_chat_id,
      title: doc.title,
      updated_at: doc.updated_at,
    },
    status: "created",
  });
}
