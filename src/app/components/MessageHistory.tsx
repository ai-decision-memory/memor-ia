import {
  buildToolActivityLabel,
  isCompletedToolState,
} from "@/lib/chat-evidence";
import type { ChatUIMessage } from "@/lib/chat-messages";
import { useEffect, useRef } from "react";
import { AssistantMessageEvidence } from "./AssistantMessageEvidence";
import { TextShimmer } from "./TextShimmer";

type MessagePart = ChatUIMessage["parts"][number];
type ToolMessagePart = MessagePart & {
  state?: unknown;
  toolName?: unknown;
  type: string;
};

type MessageHistoryProps = {
  githubOrgLogin?: string | null;
  messages: ChatUIMessage[];
  status: string;
};

function isToolPart(part: MessagePart): part is ToolMessagePart {
  return (
    part.type === "dynamic-tool" ||
    (typeof part.type === "string" && part.type.startsWith("tool-"))
  );
}

function hasVisibleAssistantContent(message: ChatUIMessage) {
  if (message.role !== "assistant") {
    return false;
  }

  return message.parts.some((part) => {
    if (isToolPart(part)) {
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

  if (isToolPart(part)) {
    const state = typeof part.state === "string" ? part.state : "unknown";

    if (isCompletedToolState(state)) {
      return null;
    }

    return (
      <div key={key} className="text-sm text-text-muted/80">
        <TextShimmer className="block">{buildToolActivityLabel(part)}</TextShimmer>
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
  const isBusy = status === "submitted" || status === "streaming";
  const lastUserMessageIndex = messages.findLastIndex(
    (message) => message.role === "user",
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
              <AssistantMessageEvidence
                githubOrgLogin={githubOrgLogin}
                message={message}
              />
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
