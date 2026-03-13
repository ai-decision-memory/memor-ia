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
      <div key={key} className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs">
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
      <div key={key} className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-zinc-800">
        <p className="font-semibold">
          Tool: <span className="font-mono">{toolName}</span>
        </p>
        <p>State: {state}</p>
        {hasInput ? (
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white p-2">
            Input: {formatValue(part.input)}
          </pre>
        ) : null}
        {hasOutput ? (
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white p-2">
            Output: {formatValue(part.output)}
          </pre>
        ) : null}
        {errorText ? <p className="mt-1 text-red-700">Error: {errorText}</p> : null}
      </div>
    );
  }

  return (
    <p key={key} className="text-xs opacity-70">
      Unsupported part: [{part.type}]
    </p>
  );
}

export function MessageHistory({ messages }: MessageHistoryProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        Start the conversation by sending your first message.
      </div>
    );
  }

  return (
    <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4">
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                isUser
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-zinc-50 text-zinc-900"
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                {isUser ? "You" : "Assistant"}
              </p>
              <div className="space-y-1 whitespace-pre-wrap">
                {message.parts.map((part, index) =>
                  renderPart(part, `${message.id}-${index}`),
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
