import type { UIMessage } from "ai";
import {
  AGENT_DOC_KINDS,
  type AgentDocKind,
  type DocGenerationClarification,
} from "./types";

type MessagePartLike = {
  state?: unknown;
  text?: unknown;
  toolName?: unknown;
  type?: unknown;
};

type NeedsClarificationDecision = {
  question: string;
  status: "needs_clarification";
};

type ReadyDecision = {
  kind: AgentDocKind;
  markdown: string;
  status: "ready";
  title: string;
};

export type DocGenerationDecision =
  | NeedsClarificationDecision
  | ReadyDecision;

const DOC_GENERATION_SYSTEM_PROMPT = `
You create markdown documentation from an existing product conversation.

You must decide whether the conversation is specific enough to generate a useful document.

If the conversation does not make both of these clear enough, ask one concise clarification question instead of generating the document:
- which feature, product area, or implementation slice the document should cover
- whether the document should be technical or user-facing

If both are clear, generate the document.

Rules:
- Ground everything in the provided conversation and clarification answers only.
- Do not invent implementation details, product behavior, repositories, APIs, or decisions that are not supported by the transcript.
- If some detail is missing but the document can still be useful, call out the gap plainly in the markdown.
- The markdown must use only headings, paragraphs, bullet lists, numbered lists, blockquotes, links, and fenced code blocks.
- Do not use HTML or markdown tables.
- Return JSON only. Do not wrap it in code fences.

When you need clarification, return:
{"status":"needs_clarification","question":"..."}

When you can generate the document, return:
{"status":"ready","title":"...","kind":"technical"|"user-facing","markdown":"# ..."}
`.trim();

function truncateValue(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function summarizeToolPart(part: MessagePartLike) {
  if (part.type !== "dynamic-tool" || typeof part.toolName !== "string") {
    return null;
  }

  const state = typeof part.state === "string" ? part.state : "unknown";
  const label =
    state === "output-error"
      ? `Tool error: ${part.toolName}`
      : `Tool used: ${part.toolName}`;

  return label;
}

function serializeMessage(message: UIMessage) {
  const lines: string[] = [];
  const parts = Array.isArray(message.parts)
    ? (message.parts as MessagePartLike[])
    : [];

  for (const part of parts) {
    if (part.type === "text" && typeof part.text === "string") {
      const text = truncateValue(part.text.trim(), 1200);

      if (text) {
        lines.push(text);
      }
    }

    const toolSummary = summarizeToolPart(part);

    if (toolSummary) {
      lines.push(toolSummary);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return [
    `${message.role.toUpperCase()}:`,
    lines.join("\n"),
  ].join("\n");
}

export function buildDocsGenerationPrompt({
  clarifications,
  messages,
}: {
  clarifications: DocGenerationClarification[];
  messages: UIMessage[];
}) {
  const serializedMessages = messages
    .map((message) => serializeMessage(message))
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  const transcript = truncateValue(serializedMessages, 18000);
  const clarificationSection =
    clarifications.length > 0
      ? clarifications
          .map(
            (clarification, index) =>
              `${index + 1}. Question: ${clarification.question}\nAnswer: ${clarification.answer}`,
          )
          .join("\n\n")
      : "None";

  return [
    "Conversation transcript:",
    transcript || "No usable transcript was provided.",
    "",
    "Clarifications already gathered:",
    clarificationSection,
    "",
    "Return only valid JSON that matches the required schema.",
  ].join("\n");
}

function extractJsonPayload(rawText: string) {
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    throw new Error("Doc generation returned an empty response");
  }

  try {
    return JSON.parse(trimmedText) as Record<string, unknown>;
  } catch {
    const firstBraceIndex = trimmedText.indexOf("{");
    const lastBraceIndex = trimmedText.lastIndexOf("}");

    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
      throw new Error("Doc generation did not return valid JSON");
    }

    return JSON.parse(
      trimmedText.slice(firstBraceIndex, lastBraceIndex + 1),
    ) as Record<string, unknown>;
  }
}

function isAgentDocKind(value: unknown): value is AgentDocKind {
  return (
    typeof value === "string" &&
    AGENT_DOC_KINDS.includes(value as AgentDocKind)
  );
}

export function parseDocGenerationDecision(rawText: string): DocGenerationDecision {
  const payload = extractJsonPayload(rawText);

  if (payload.status === "needs_clarification") {
    if (typeof payload.question !== "string" || payload.question.trim() === "") {
      throw new Error("Doc generation returned an invalid clarification question");
    }

    return {
      question: payload.question.trim(),
      status: "needs_clarification",
    };
  }

  if (payload.status !== "ready") {
    throw new Error("Doc generation returned an unsupported status");
  }

  if (typeof payload.title !== "string" || payload.title.trim() === "") {
    throw new Error("Doc generation returned an invalid title");
  }

  if (!isAgentDocKind(payload.kind)) {
    throw new Error("Doc generation returned an invalid document kind");
  }

  if (typeof payload.markdown !== "string" || payload.markdown.trim() === "") {
    throw new Error("Doc generation returned empty markdown");
  }

  return {
    kind: payload.kind,
    markdown: payload.markdown.trim(),
    status: "ready",
    title: payload.title.trim(),
  };
}

export { DOC_GENERATION_SYSTEM_PROMPT };
