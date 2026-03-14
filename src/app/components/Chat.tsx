"use client";

import {
  buildChatTitleFromMessages,
  DEFAULT_CHAT_TITLE,
} from "@/lib/chats/title";
import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Composer } from "./Composer";
import { MessageHistory } from "./MessageHistory";

type ChatSummary = {
  created_at: string;
  id: string;
  title: string;
  updated_at: string;
};

type PersistedChat = ChatSummary & {
  messages: UIMessage[];
};

const NEW_CHAT_ID = "new-chat";

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
        connected ? "bg-emerald-400" : "bg-red-400"
      }`}
    />
  );
}

function McpIcon() {
  return (
    <svg fill="currentColor" fillRule="evenodd" height="14" width="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" /><path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" /></svg>
  );
}

function WarningIcon() {
  return <span className="text-xs leading-none">⚠️</span>;
}

function ConnectionModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-sidebar p-6">
        {children}
      </div>
    </div>
  );
}

function GitHubModal({ onClose, serverError }: { onClose: () => void; serverError: string | null }) {
  const [error, setError] = useState<string | null>(serverError);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/github/pat", {
      method: "POST",
      body: new FormData(e.currentTarget),
      redirect: "manual",
    });

    if (response.type === "opaqueredirect" || response.status === 307) {
      window.location.reload();
      return;
    }

    setError((await response.text()) || "Failed to save GitHub PAT");
    setSubmitting(false);
  };

  return (
    <ConnectionModal onClose={onClose}>
      <p className="text-sm font-medium text-text-primary">Connect GitHub</p>
      <p className="mt-1 text-xs text-text-muted">
        Generate a fine-grained PAT in{" "}
        <a className="underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">GitHub settings</a>.
      </p>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-950/40 p-2 text-xs text-red-400">{error}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary" htmlFor="modal-github-org">Organization login</label>
          <input id="modal-github-org" name="organizationLogin" type="text" required placeholder="your-org"
            className="mt-1 w-full rounded-lg bg-page px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary" htmlFor="modal-github-pat">Personal access token</label>
          <input id="modal-github-pat" name="personalAccessToken" type="password" required placeholder="github_pat_..."
            className="mt-1 w-full rounded-lg bg-page px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted" />
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
          <button type="submit" disabled={submitting}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-text transition hover:opacity-80 disabled:opacity-40">
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ConnectionModal>
  );
}

function LinearModal({ onClose, serverError }: { onClose: () => void; serverError: string | null }) {
  const [error, setError] = useState<string | null>(serverError);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/linear/api-key", {
      method: "POST",
      body: new FormData(e.currentTarget),
      redirect: "manual",
    });

    if (response.type === "opaqueredirect" || response.status === 307) {
      window.location.reload();
      return;
    }

    setError((await response.text()) || "Failed to save Linear API key");
    setSubmitting(false);
  };

  return (
    <ConnectionModal onClose={onClose}>
      <p className="text-sm font-medium text-text-primary">Connect Linear</p>
      <p className="mt-1 text-xs text-text-muted">
        Generate a personal API key from{" "}
        <a className="underline" href="https://linear.app/settings/account/security" target="_blank" rel="noreferrer">Linear settings</a>.
      </p>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-950/40 p-2 text-xs text-red-400">{error}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary" htmlFor="modal-linear-key">Personal API key</label>
          <input id="modal-linear-key" name="personalApiKey" type="password" required placeholder="lin_api_..."
            className="mt-1 w-full rounded-lg bg-page px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted" />
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
          <button type="submit" disabled={submitting}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-text transition hover:opacity-80 disabled:opacity-40">
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ConnectionModal>
  );
}

export const Chat = ({
  activeChat,
  chats,
  githubPatError,
  githubPatSession,
  isSlackConnected,
  linearApiKeyError,
  linearApiKeySession,
  slackSession,
}: {
  activeChat: PersistedChat | null;
  chats: ChatSummary[];
  githubPatError: string | null;
  githubPatSession: {
    orgLogin: string;
    userLogin: string;
  } | null;
  isSlackConnected: boolean;
  linearApiKeyError: string | null;
  linearApiKeySession: {
    teamKey: string;
    teamName: string;
    userName: string;
  } | null;
  slackSession: {
    teamName: string | null;
  } | null;
}) => {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isDeletingChatId, setIsDeletingChatId] = useState<string | null>(null);
  const [pendingInitialPrompt, setPendingInitialPrompt] = useState<string | null>(null);
  const [sidebarChats, setSidebarChats] = useState<ChatSummary[]>(chats);
  const [transientChat, setTransientChat] = useState<PersistedChat | null>(null);
  const [openModal, setOpenModal] = useState<"github" | "linear" | null>(
    githubPatError ? "github" : linearApiKeyError ? "linear" : null,
  );

  const allConnected = isSlackConnected && !!githubPatSession && !!linearApiKeySession;

  const resolvedActiveChat = transientChat ?? activeChat;
  const activeChatId = resolvedActiveChat?.id ?? null;
  const initialMessages = useMemo(
    () => resolvedActiveChat?.messages ?? [],
    [resolvedActiveChat?.messages],
  );
  const chatStatus = isCreatingChat ? "submitted" : undefined;

  const updateSidebarChatTitle = (chatId: string, title: string) => {
    setSidebarChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title,
            }
          : chat,
      ),
    );
  };

  const persistChatTitle = async ({
    chatId,
    title,
  }: {
    chatId: string;
    title: string;
  }) => {
    const response = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to update chat title");
    }

    const payload = (await response.json()) as {
      chat: ChatSummary;
    };

    return payload.chat;
  };

  const {
    error,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
  } = useChat<UIMessage>({
    id: activeChatId ?? NEW_CHAT_ID,
    messages: initialMessages,
    onFinish: async ({ messages: finishedMessages }) => {
      if (!activeChatId) {
        return;
      }

      const currentChat = sidebarChats.find((chat) => chat.id === activeChatId);

      if (!currentChat || currentChat.title !== DEFAULT_CHAT_TITLE) {
        return;
      }

      const nextTitle = buildChatTitleFromMessages(finishedMessages);

      if (nextTitle === DEFAULT_CHAT_TITLE) {
        return;
      }

      try {
        const updatedChat = await persistChatTitle({
          chatId: activeChatId,
          title: nextTitle,
        });
        updateSidebarChatTitle(updatedChat.id, updatedChat.title);
      } catch (titleError) {
        setClientError(
          titleError instanceof Error
            ? titleError.message
            : "Failed to update chat title",
        );
      }
    },
  });

  useEffect(() => {
    setSidebarChats(chats);
  }, [chats]);

  useEffect(() => {
    if (activeChat?.id) {
      setTransientChat(null);
    }
  }, [activeChat?.id]);

  useEffect(() => {
    if (
      !activeChatId ||
      !pendingInitialPrompt ||
      status !== "ready" ||
      messages.length > 0
    ) {
      return;
    }

    const prompt = pendingInitialPrompt;
    setPendingInitialPrompt(null);
    void sendMessage({ text: prompt });
  }, [activeChatId, messages.length, pendingInitialPrompt, sendMessage, status]);

  const displayedStatus = chatStatus ?? status;

  const resetDraftState = () => {
    stop();
    setClientError(null);
    setInput("");
    setPendingInitialPrompt(null);
    setTransientChat(null);
    setMessages([]);
  };

  const handleStartNewChat = () => {
    resetDraftState();
    router.push("/");
  };

  const moveChatToTop = (chatId: string) => {
    setSidebarChats((currentChats) => {
      const chat = currentChats.find((item) => item.id === chatId);

      if (!chat) {
        return currentChats;
      }

      const updatedChat = {
        ...chat,
        updated_at: new Date().toISOString(),
      };

      return [
        updatedChat,
        ...currentChats.filter((item) => item.id !== chatId),
      ];
    });
  };

  const handleCreateChat = async (firstMessageText: string) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ firstMessageText }),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to create chat");
    }

    const payload = (await response.json()) as {
      chat: ChatSummary;
    };

    return payload.chat;
  };

  const handleSendMessage = async ({ text }: { text: string }) => {
    setClientError(null);

    if (activeChatId) {
      moveChatToTop(activeChatId);
      await sendMessage({ text });
      return;
    }

    if (isCreatingChat) {
      return;
    }

    setIsCreatingChat(true);

    try {
      const createdChat = await handleCreateChat(text);
      setSidebarChats((currentChats) => [
        createdChat,
        ...currentChats.filter((chat) => chat.id !== createdChat.id),
      ]);
      setTransientChat({
        ...createdChat,
        messages: [],
      });
      setPendingInitialPrompt(text);
      window.history.replaceState(null, "", `/chats/${createdChat.id}`);
    } catch (createError) {
      setClientError(
        createError instanceof Error
          ? createError.message
          : "Failed to create chat",
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const confirmed = window.confirm(
      "Delete this chat? Its saved messages will be removed."
    );

    if (!confirmed) {
      return;
    }

    setClientError(null);
    setIsDeletingChatId(chatId);

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to delete chat");
      }

      setSidebarChats((currentChats) =>
        currentChats.filter((chat) => chat.id !== chatId),
      );

      if (activeChatId === chatId) {
        router.push("/");
      }
    } catch (deleteError) {
      setClientError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete chat",
      );
    } finally {
      setIsDeletingChatId(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-sidebar lg:flex-row">
      <aside className="flex w-full flex-col px-4 py-4 text-text-primary lg:h-screen lg:w-72 lg:shrink-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
            Conversations
          </p>
          <button
            type="button"
            onClick={handleStartNewChat}
            className="rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
          >
            + New
          </button>
        </div>

        <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto">
          {sidebarChats.length === 0 ? (
            <div className="px-3 py-6 text-sm text-text-muted">
              No chats yet.
            </div>
          ) : (
            sidebarChats.map((chat) => {
              const isActive = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                    isActive
                      ? "bg-page text-text-primary"
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  }`}
                >
                  <Link
                    href={`/chats/${chat.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm">{chat.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatRelativeTimestamp(chat.updated_at)}
                    </p>
                  </Link>
                  <button
                    type="button"
                    disabled={isDeletingChatId === chat.id}
                    onClick={() => void handleDeleteChat(chat.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-text-muted transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    &times;
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className="group mt-3 shrink-0 rounded-xl transition-colors duration-300 hover:bg-page">
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-in-out group-hover:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="space-y-2.5 px-3 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot connected={isSlackConnected} />
                    <p className="text-xs font-medium text-text-primary">Slack</p>
                  </div>
                  {isSlackConnected ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-text-muted">{slackSession?.teamName ?? "Connected"}</p>
                      <a href="/api/slack/connect" className="text-xs text-text-muted hover:text-text-primary">(reconnect)</a>
                    </div>
                  ) : (
                    <a href="/api/slack/connect" className="text-xs font-medium text-accent hover:underline">Connect</a>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot connected={!!githubPatSession} />
                    <p className="text-xs font-medium text-text-primary">GitHub</p>
                  </div>
                  {githubPatSession ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-text-muted">{githubPatSession.orgLogin}</p>
                      <button type="button" onClick={() => setOpenModal("github")} className="text-xs text-text-muted hover:text-text-primary">(change)</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setOpenModal("github")} className="text-xs font-medium text-accent hover:underline">Connect</button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot connected={!!linearApiKeySession} />
                    <p className="text-xs font-medium text-text-primary">Linear</p>
                  </div>
                  {linearApiKeySession ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-text-muted">{linearApiKeySession.teamName}</p>
                      <button type="button" onClick={() => setOpenModal("linear")} className="text-xs text-text-muted hover:text-text-primary">(change)</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setOpenModal("linear")} className="text-xs font-medium text-accent hover:underline">Connect</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 text-text-muted">
            <McpIcon />
            <span className="text-xs">MCP Connections</span>
            {!allConnected ? <WarningIcon /> : null}
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col rounded-2xl bg-page p-4 lg:my-3 lg:mr-3 lg:p-6">
        <div className="min-h-0 flex-1">
          <MessageHistory messages={messages} />
        </div>

        {clientError ? (
          <p className="mx-auto mt-2 w-full max-w-3xl rounded-lg bg-red-950/40 p-3 text-sm text-red-400">
            {clientError}
          </p>
        ) : null}

        {error ? (
          <p className="mx-auto mt-2 w-full max-w-3xl rounded-lg bg-red-950/40 p-3 text-sm text-red-400">
            {error.message}
          </p>
        ) : null}

        <div className="shrink-0 pt-2">
          <Composer
            input={input}
            onInputChange={setInput}
            onSendMessage={handleSendMessage}
            onStop={stop}
            status={displayedStatus}
          />
        </div>
      </main>

      {openModal === "github" ? <GitHubModal onClose={() => setOpenModal(null)} serverError={githubPatError} /> : null}
      {openModal === "linear" ? <LinearModal onClose={() => setOpenModal(null)} serverError={linearApiKeyError} /> : null}
    </div>
  );
};

function formatRelativeTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
