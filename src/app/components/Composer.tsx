import { FormEvent } from "react";

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isBusy) {
      return;
    }

    onInputChange("");
    await onSendMessage({ text: trimmedInput });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="chat-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Write a message..."
          rows={3}
          className="min-h-[84px] flex-1 text-gray-600 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
        />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={!isStreaming}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop
          </button>
        </div>
      </div>
    </form>
  );
}
