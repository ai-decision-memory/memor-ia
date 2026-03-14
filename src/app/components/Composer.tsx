import { FormEvent, KeyboardEvent } from "react";

type ComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: { text: string }) => Promise<void> | void;
  onStop: () => void;
  status: string;
};

export function Composer({
  input,
  onInputChange,
  onSendMessage,
  onStop,
  status,
}: ComposerProps) {
  const isStreaming = status === "streaming";
  const isSending = status === "submitted";
  const isBusy = isStreaming || isSending;
  const hasInput = input.trim().length > 0;
  const showAction = hasInput || isBusy;
  const label = isBusy ? "stop" : "send";

  const submit = async () => {
    if (isBusy) {
      onStop();
      return;
    }

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return;
    }

    onInputChange("");
    await onSendMessage({ text: trimmedInput });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-auto w-full max-w-3xl rounded-xl bg-sidebar p-3"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-input"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a message..."
        rows={3}
        className="w-full resize-none bg-transparent px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
      <div className="flex h-6 items-center justify-end overflow-hidden pr-3">
        <button
          type="submit"
          className={`text-xs font-medium transition-all duration-200 ${
            showAction
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          } ${
            label === "stop"
              ? "text-text-muted"
              : "text-text-secondary hover:text-text-primary"
          }`}
          style={label === "stop" ? { animation: "pulse-subtle 2s ease-in-out infinite" } : undefined}
          tabIndex={showAction ? 0 : -1}
        >
          {label === "stop" ? "\u25A0 stop" : "send \u2192"}
        </button>
      </div>
    </form>
  );
}
