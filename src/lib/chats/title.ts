import { UIMessage } from "ai";

export const DEFAULT_CHAT_TITLE = "New Chat";

type MessagePartLike = {
  input?: unknown;
  text?: unknown;
  toolName?: unknown;
  type?: unknown;
};

const GENERIC_PROMPT_PATTERNS = [
  /^(hi|hello|hey|yo|sup)[!.?]*$/i,
  /^(help|start|continue|go on|next)[!.?]*$/i,
  /^(can you help|can you assist|what can you do)[!.?]*$/i,
] as const;

function normalizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}

function truncateText(value: string) {
  if (value.length <= 80) {
    return value;
  }

  return `${value.slice(0, 77).trimEnd()}...`;
}

function isGenericPrompt(prompt: string) {
  if (!prompt) {
    return true;
  }

  return GENERIC_PROMPT_PATTERNS.some((pattern) => pattern.test(prompt));
}

function getTextFromMessage(message: UIMessage) {
  const textParts: string[] = [];

  for (const part of message.parts as MessagePartLike[]) {
    if (part.type === "text" && typeof part.text === "string") {
      textParts.push(part.text);
    }
  }

  return textParts.join(" ").trim();
}

function getProviderLabel(toolName: string) {
  if (toolName.startsWith("linear_")) {
    return "Linear";
  }

  if (toolName.startsWith("github_")) {
    return "GitHub";
  }

  return null;
}

function getToolSubjectLabel(toolName: string) {
  if (/\bissues?\b/i.test(toolName)) {
    return "issues";
  }

  if (/\bprojects?\b/i.test(toolName)) {
    return "projects";
  }

  if (/\bdeploy/i.test(toolName)) {
    return "deployments";
  }

  if (/\bcommits?\b/i.test(toolName)) {
    return "commits";
  }

  if (/\bbranches?\b/i.test(toolName)) {
    return "branches";
  }

  if (/\brepositor(y|ies)\b/i.test(toolName) || /\brepos?\b/i.test(toolName)) {
    return "repositories";
  }

  if (/\bteams?\b/i.test(toolName)) {
    return "team";
  }

  if (/\bmembers?\b/i.test(toolName) || /\busers?\b/i.test(toolName)) {
    return "members";
  }

  if (/\bchannels?\b/i.test(toolName)) {
    return "channels";
  }

  if (/\bthreads?\b/i.test(toolName)) {
    return "thread";
  }

  if (/\bworkspace\b/i.test(toolName)) {
    return "workspace";
  }

  return null;
}

function getToolInputTitle(toolName: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const repo = typeof record.repo === "string" ? normalizePrompt(record.repo) : null;
  const provider = getProviderLabel(toolName);
  const subject = getToolSubjectLabel(toolName);

  if (provider === "GitHub" && repo) {
    if (subject && subject !== "repositories") {
      return truncateText(`GitHub ${repo} ${subject}`);
    }

    return truncateText(`GitHub ${repo}`);
  }

  if (provider && subject) {
    return truncateText(`${provider} ${subject}`);
  }

  if (provider) {
    return truncateText(`${provider} chat`);
  }

  return null;
}

function getFirstToolDerivedTitle(messages: UIMessage[]) {
  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    for (const part of message.parts as MessagePartLike[]) {
      if (
        part.type === "dynamic-tool" &&
        typeof part.toolName === "string"
      ) {
        const toolTitle = getToolInputTitle(part.toolName, part.input);

        if (toolTitle) {
          return toolTitle;
        }
      }
    }
  }

  return null;
}

export function normalizeChatTitle(title: string | null | undefined) {
  const normalizedTitle = normalizePrompt(title ?? "");
  return normalizedTitle || DEFAULT_CHAT_TITLE;
}

export function normalizeChatGroupName(groupName: string | null | undefined) {
  const normalizedGroupName = normalizePrompt(groupName ?? "");
  return normalizedGroupName ? truncateText(normalizedGroupName) : null;
}

export function buildChatTitleFromPrompt(prompt: string) {
  const normalizedPrompt = normalizePrompt(prompt);

  if (isGenericPrompt(normalizedPrompt)) {
    return DEFAULT_CHAT_TITLE;
  }

  return truncateText(normalizedPrompt);
}

export function buildChatTitleFromMessages(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const userTitle = buildChatTitleFromPrompt(
    firstUserMessage ? getTextFromMessage(firstUserMessage) : "",
  );

  if (userTitle !== DEFAULT_CHAT_TITLE) {
    return userTitle;
  }

  return getFirstToolDerivedTitle(messages) ?? DEFAULT_CHAT_TITLE;
}
