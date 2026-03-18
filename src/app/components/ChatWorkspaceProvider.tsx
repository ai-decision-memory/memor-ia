"use client";

import type { UIMessage } from "ai";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

type TemporaryChat = {
  created_at: string;
  id: string;
  messages: UIMessage[];
  title: string;
  updated_at: string;
};

type ChatWorkspaceContextValue = {
  clearTemporaryChat: () => void;
  setTemporaryChat: Dispatch<SetStateAction<TemporaryChat | null>>;
  temporaryChat: TemporaryChat | null;
};

const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);

export function ChatWorkspaceProvider({ children }: { children: ReactNode }) {
  const [temporaryChat, setTemporaryChat] = useState<TemporaryChat | null>(null);

  const value = useMemo(
    () => ({
      clearTemporaryChat: () => setTemporaryChat(null),
      setTemporaryChat,
      temporaryChat,
    }),
    [temporaryChat],
  );

  return (
    <ChatWorkspaceContext.Provider value={value}>
      {children}
    </ChatWorkspaceContext.Provider>
  );
}

export function useChatWorkspace() {
  const context = useContext(ChatWorkspaceContext);

  if (!context) {
    throw new Error("useChatWorkspace must be used within ChatWorkspaceProvider");
  }

  return context;
}

export type { TemporaryChat };
