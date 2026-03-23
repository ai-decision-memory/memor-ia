import { extractSourceCitationsFromMessage } from "@/lib/citations";
import { useEffect, useRef } from "react";
import { SourceCitationList } from "./SourceCitationList";
import { TextShimmer } from "./TextShimmer";

type MessagePart = {
  type: string;
  [key: string]: unknown;
};

type ChatMessage = {
  id: string;
  role: string;
  parts: MessagePart[];
};

type MessageHistoryProps = {
  githubOrgLogin?: string | null;
  messages: ChatMessage[];
  status: string;
};

function getToolProviderLabel(toolName: string) {
  if (toolName.startsWith("linear_")) {
    return "Linear";
  }

  if (toolName.startsWith("github_")) {
    return "GitHub";
  }

  return null;
}

function splitToolName(toolName: string) {
  const provider = getToolProviderLabel(toolName);
  const normalizedName = provider ? toolName.slice(provider.length + 1) : toolName;
  const [action = "use", ...subjectParts] = normalizedName.split("_");

  return {
    action,
    provider,
    subjectParts,
  };
}

function humanizeSubject(toolName: string) {
  const { provider, subjectParts } = splitToolName(toolName);
  const formattedProvider = provider ? `${provider} ` : "";
  const subject = subjectParts
    .map((part) => {
      if (part === "org") {
        return "organization";
      }

      if (part === "repo") {
        return "repository";
      }

      return part;
    })
    .join(" ")
    .trim();

  return `${formattedProvider}${subject || "tool"}`.trim();
}

function truncateInlineValue(value: string) {
  if (value.length <= 80) {
    return value;
  }

  return `${value.slice(0, 77).trimEnd()}...`;
}

function summarizeToolInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "";
  }

  const record = input as Record<string, unknown>;

  for (const key of ["query", "q", "question", "prompt", "repo", "repository", "project", "team"]) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return ` for ${truncateInlineValue(record[key].trim())}`;
    }
  }

  return "";
}

function getActionLabels(action: string) {
  switch (action) {
    case "search":
      return { continuous: "Searching", past: "Searched", infinitive: "search" };
    case "list":
      return { continuous: "Listing", past: "Listed", infinitive: "list" };
    case "get":
      return { continuous: "Getting", past: "Got", infinitive: "get" };
    case "read":
      return { continuous: "Reading", past: "Read", infinitive: "read" };
    case "find":
      return { continuous: "Finding", past: "Found", infinitive: "find" };
    case "query":
      return { continuous: "Querying", past: "Queried", infinitive: "query" };
    case "create":
      return { continuous: "Creating", past: "Created", infinitive: "create" };
    case "update":
      return { continuous: "Updating", past: "Updated", infinitive: "update" };
    default:
      return { continuous: "Using", past: "Used", infinitive: "use" };
  }
}

function buildToolActivityLabel(part: MessagePart) {
  const toolName = typeof part.toolName === "string" ? part.toolName : "unknown";
  const state = typeof part.state === "string" ? part.state : "unknown";
  const { action } = splitToolName(toolName);
  const subject = humanizeSubject(toolName);
  const qualifier = summarizeToolInput(part.input);
  const labels = getActionLabels(action);

  if (state === "output-error") {
    return `Failed to ${labels.infinitive} ${subject}${qualifier}`;
  }

  if (state === "output-available") {
    return `${labels.past} ${subject}${qualifier}`;
  }

  return `${labels.continuous} ${subject}${qualifier}`;
}

function isCompletedToolState(state: string) {
  return state === "output-available" || state === "output-error";
}

function hasVisibleAssistantContent(message: ChatMessage) {
  if (message.role !== "assistant") {
    return false;
  }

  return message.parts.some((part) => {
    if (part.type === "dynamic-tool") {
      return true;
    }

    if (part.type === "text") {
      return typeof part.text === "string" && part.text.trim().length > 0;
    }

    return false;
  });
}

function renderPart(part: MessagePart, key: string) {
  if (part.type === "text") {
    const text = typeof part.text === "string" ? part.text : "";
    return <p key={key}>{text}</p>;
  }

  if (part.type === "step-start") {
    return null;
  }

  if (part.type === "dynamic-tool") {
    const state = typeof part.state === "string" ? part.state : "unknown";
    const label = buildToolActivityLabel(part);
    const isCompleted = isCompletedToolState(state);

    return (
      <div key={key} className="text-sm text-text-muted/80">
        {isCompleted ? (
          <span
            className={
              state === "output-error" ? "block text-red-400" : "block"
            }
          >
            {label}
          </span>
        ) : (
          <TextShimmer className="block">{label}</TextShimmer>
        )}
      </div>
    );
  }

  return null;
}

export function MessageHistory({
  githubOrgLogin,
  messages,
  status,
}: MessageHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loggedToolCallsRef = useRef<Set<string>>(new Set());
  const isBusy = status === "submitted" || status === "streaming";
  const lastUserMessageIndex = messages.findLastIndex(
    (message) => message.role === "user"
  );
  const hasVisibleAssistantContentAfterLastUser =
    lastUserMessageIndex >= 0 &&
    messages
      .slice(lastUserMessageIndex + 1)
      .some((message) => hasVisibleAssistantContent(message));
  const showPendingResponse =
    isBusy &&
    lastUserMessageIndex >= 0 &&
    !hasVisibleAssistantContentAfterLastUser;

  useEffect(() => {
    for (const message of messages) {
      for (let index = 0; index < message.parts.length; index += 1) {
        const part = message.parts[index];

        if (part.type !== "dynamic-tool") {
          continue;
        }

        const toolName =
          typeof part.toolName === "string" ? part.toolName : "unknown";
        const state = typeof part.state === "string" ? part.state : "unknown";
        const toolCallId =
          typeof part.toolCallId === "string"
            ? part.toolCallId
            : `${message.id}-${toolName}-${index}`;

        if (!isCompletedToolState(state)) {
          continue;
        }

        if (loggedToolCallsRef.current.has(toolCallId)) {
          continue;
        }

        loggedToolCallsRef.current.add(toolCallId);
        const summary = buildToolActivityLabel(part);
        const consoleMethod =
          state === "output-error"
            ? console.error
            : console.info;

        consoleMethod(`[tool] ${summary}`, {
          input: "input" in part ? part.input : undefined,
          output: "output" in part ? part.output : undefined,
          state,
          toolCallId,
          toolName,
        });

        if (typeof part.errorText === "string") {
          console.error(`[tool] ${summary}`, {
            error: part.errorText,
            state,
            toolCallId,
            toolName,
          });
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showPendingResponse]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Start the conversation by sending your first message.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto pt-4 pb-10">
      <div className="mx-auto max-w-[730px] space-y-5">
        {messages.map((message) => {
          const isUser = message.role === "user";
          const citations = isUser
            ? []
            : extractSourceCitationsFromMessage(message, {
                githubOrgLogin,
              });

          if (isUser) {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl bg-sidebar px-4 py-3 text-sm text-text-primary">
                  <div className="space-y-1 whitespace-pre-wrap">
                    {message.parts.map((part, index) =>
                      renderPart(part, `${message.id}-${index}`),
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="text-sm text-text-primary">
              <div className="space-y-2 whitespace-pre-wrap">
                {message.parts.map((part, index) =>
                  renderPart(part, `${message.id}-${index}`),
                )}
              </div>
              {citations.length > 0 ? <SourceCitationList citations={citations} /> : null}
            </div>
          );
        })}
        {showPendingResponse ? (
          <div className="text-sm text-text-muted/80">
            <TextShimmer className="block">Generating response</TextShimmer>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
