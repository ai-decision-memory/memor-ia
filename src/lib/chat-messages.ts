import type { UIMessage } from "ai";

export type ChatMessageMetadata = {
  completedAt?: number;
  createdAt?: number;
  finishReason?: string;
  inputTokens?: number;
  model?: string;
  outputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
