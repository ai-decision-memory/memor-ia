import type { ChatUIMessage } from "@/lib/chat-messages";

function roleHeading(role: string) {
  if (role === "user") {
    return "You";
  }

  if (role === "assistant") {
    return "Assistant";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function textFromParts(parts: ChatUIMessage["parts"]): string {
  const chunks: string[] = [];

  for (const part of parts) {
    if (part.type === "text") {
      const text = typeof part.text === "string" ? part.text.trim() : "";
      if (text !== "") {
        chunks.push(text);
      }
    }
  }

  return chunks.join("\n\n");
}

export function buildMarkdownFromChatMessages(messages: ChatUIMessage[]): string {
  const sections: string[] = [];

  for (const message of messages) {
    const body = textFromParts(message.parts);

    if (body === "") {
      continue;
    }

    sections.push(`## ${roleHeading(message.role)}\n\n${body}`);
  }

  return sections.join("\n\n").trim();
}
