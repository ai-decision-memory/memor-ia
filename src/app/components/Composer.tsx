"use client";

import { motion, type Transition } from "motion/react";
import { FormEvent, KeyboardEvent } from "react";

function BorderTrail({
  className,
  size = 60,
  transition,
}: {
  className?: string;
  size?: number;
  transition?: Transition;
}) {
  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 4,
    ease: "linear",
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={`absolute aspect-square ${className ?? "bg-zinc-500"}`}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
        }}
        animate={{
          offsetDistance: ["0%", "100%"],
        }}
        transition={transition ?? defaultTransition}
      />
    </div>
  );
}

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
      className="relative mx-auto w-full max-w-3xl rounded-xl bg-sidebar p-3"
    >
      {isBusy ? (
        <BorderTrail
          size={80}
          className="bg-gradient-to-l from-zinc-400 via-zinc-500/50 to-transparent"
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear",
          }}
        />
      ) : null}
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-input"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a message..."
        rows={2}
        className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
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
