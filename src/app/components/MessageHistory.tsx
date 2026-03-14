import { useEffect, useRef } from "react";

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
  messages: ChatMessage[];
};

function formatValue(value: unknown) {
  if (value == null) {
    return "none";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderPart(part: MessagePart, key: string) {
  if (part.type === "text") {
    const text = typeof part.text === "string" ? part.text : "";
    return <p key={key}>{text}</p>;
  }

  if (part.type === "step-start") {
    return (
      <div key={key} className="rounded-md bg-surface-raised px-2 py-1 text-xs text-text-muted">
        New reasoning step
      </div>
    );
  }

  if (part.type === "dynamic-tool") {
    const toolName = typeof part.toolName === "string" ? part.toolName : "unknown";
    const state = typeof part.state === "string" ? part.state : "unknown";
    const hasInput = "input" in part;
    const hasOutput = "output" in part;
    const errorText = typeof part.errorText === "string" ? part.errorText : undefined;

    return (
      <div key={key} className="rounded-md bg-surface-raised p-2 text-xs text-text-secondary">
        <p className="font-semibold text-text-primary">
          Tool: <span className="font-mono">{toolName}</span>
        </p>
        <p>State: {state}</p>
        {hasInput ? (
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-page p-2 text-text-muted">
            Input: {formatValue(part.input)}
          </pre>
        ) : null}
        {hasOutput ? (
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-page p-2 text-text-muted">
            Output: {formatValue(part.output)}
          </pre>
        ) : null}
        {errorText ? <p className="mt-1 text-red-400">Error: {errorText}</p> : null}
      </div>
    );
  }

  return (
    <p key={key} className="text-xs text-text-muted">
      Unsupported part: [{part.type}]
    </p>
  );
}

export function MessageHistory({ messages }: MessageHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
