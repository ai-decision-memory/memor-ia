"use client";

import {
  buildChatTitleFromMessages,
  DEFAULT_CHAT_TITLE,
} from "@/lib/chats/title";
import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

export const Chat = ({
  activeChat,
  chats,
  githubPatError,
  githubPatSession,
  isSlackConnected,
  linearApiKeyError,
  linearApiKeySession,
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
}) => {
  if (!isSlackConnected || !githubPatSession || !linearApiKeySession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4 py-8">
        <section className="w-full max-w-2xl rounded-2xl bg-sidebar p-6 text-center">
          <p className="text-lg font-medium text-text-primary">
            Connect Slack, add a GitHub PAT, and add a Linear API key to start chatting.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Slack is connected through OAuth. GitHub uses a fine-grained personal
            access token stored server-side for the current session. Linear uses a
            personal API key stored server-side for the current session.
          </p>
          <div className="mt-5 space-y-4 text-left">
            {isSlackConnected ? (
              <span className="inline-flex rounded-full border border-border-strong bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary">
                Slack connected
              </span>
            ) : (
              <a
                className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-medium text-page transition hover:bg-text-secondary"
                href="/api/slack/connect"
              >
                Connect Slack
              </a>
            )}

            {githubPatSession ? (
              <span className="inline-flex rounded-full border border-border-strong bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary">
                GitHub connected as {githubPatSession.userLogin} for {githubPatSession.orgLogin}
              </span>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Generate a fine-grained PAT in{" "}
                  <a
                    className="font-medium text-text-primary underline"
                    href="https://github.com/settings/personal-access-tokens/new"
                    rel="noreferrer"
                    target="_blank"
                  >
                    GitHub settings
                  </a>
                  .
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                  <li>Set the organization as the resource owner.</li>
                  <li>Select the repositories the agent should inspect.</li>
                  <li>Grant repository read access to Contents, Deployments, Issues, and Metadata.</li>
                  <li>Grant organization read access to Members so the agent can inspect teams and members.</li>
                </ul>
                {githubPatError ? (
                  <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
                    {githubPatError}
                  </p>
                ) : null}
                <form
                  action="/api/github/pat"
                  method="post"
                  className="space-y-3"
                >
                  <div>
                    <label
                      className="block text-sm font-medium text-text-primary"
                      htmlFor="github-org-login"
                    >
                      Organization login
                    </label>
                    <input
                      id="github-org-login"
                      name="organizationLogin"
                      type="text"
                      className="mt-1 w-full rounded-lg border border-border-subtle bg-page px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-strong"
                      placeholder="your-org"
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-text-primary"
                      htmlFor="github-pat"
                    >
                      Fine-grained personal access token
                    </label>
                    <input
                      id="github-pat"
                      name="personalAccessToken"
                      type="password"
                      className="mt-1 w-full rounded-lg border border-border-subtle bg-page px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-strong"
                      placeholder="github_pat_..."
                      required
                    />
                  </div>
                  <button
                    className="inline-flex rounded-full border border-border-strong bg-surface px-5 py-3 text-sm font-medium text-text-primary transition hover:bg-surface-raised"
                    type="submit"
                  >
                    Save GitHub PAT
                  </button>
                </form>
              </div>
            )}

            {linearApiKeySession ? (
              <span className="inline-flex rounded-full border border-border-strong bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary">
                Linear connected as {linearApiKeySession.userName} for {linearApiKeySession.teamKey} ({linearApiKeySession.teamName})
              </span>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Open Linear and generate a personal API key from{" "}
                  <a
                    className="font-medium text-text-primary underline"
                    href="https://linear.app/settings/account/security"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Settings &gt; Account &gt; Security &amp; Access
                  </a>
                  .
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                  <li>If you do not see Personal API keys there, ask a Linear admin to enable Member API keys in Settings &gt; Administration &gt; API.</li>
                  <li>You only need one personal API key here. There is no separate team API key for this app.</li>
                  <li>Limit that API key to exactly one team. The app will infer the team automatically from the key.</li>
                  <li>Grant read access so the assistant can inspect issues, projects, and workflow states.</li>
                </ul>
                {linearApiKeyError ? (
                  <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
                    {linearApiKeyError}
                  </p>
                ) : null}
                <form
                  action="/api/linear/api-key"
                  method="post"
                  className="space-y-3"
                >
                  <div>
                    <label
                      className="block text-sm font-medium text-text-primary"
                      htmlFor="linear-api-key"
                    >
                      Personal API key
                    </label>
                    <input
                      id="linear-api-key"
                      name="personalApiKey"
                      type="password"
                      className="mt-1 w-full rounded-lg border border-border-subtle bg-page px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-strong"
                      placeholder="lin_api_..."
                      required
                    />
                  </div>
                  <button
                    className="inline-flex rounded-full border border-border-strong bg-surface px-5 py-3 text-sm font-medium text-text-primary transition hover:bg-surface-raised"
                    type="submit"
                  >
                    Save Linear API key
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <ConnectedChatWorkspace
      activeChat={activeChat}
      chats={chats}
      githubPatSession={githubPatSession}
      linearApiKeySession={linearApiKeySession}
    />
  );
};

const ConnectedChatWorkspace = ({
  activeChat,
  chats,
  githubPatSession,
  linearApiKeySession,
}: {
  activeChat: PersistedChat | null;
  chats: ChatSummary[];
  githubPatSession: {
    orgLogin: string;
    userLogin: string;
  };
  linearApiKeySession: {
    teamKey: string;
    teamName: string;
    userName: string;
  };
}) => {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isDeletingChatId, setIsDeletingChatId] = useState<string | null>(null);
  const [pendingInitialPrompt, setPendingInitialPrompt] = useState<string | null>(null);
  const [sidebarChats, setSidebarChats] = useState<ChatSummary[]>(chats);
  const [transientChat, setTransientChat] = useState<PersistedChat | null>(null);

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
      router.replace(`/chats/${createdChat.id}`);
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
    <div className="flex h-screen flex-col bg-page lg:flex-row">
      <aside className="w-full bg-sidebar px-4 py-4 text-text-primary lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">
            Chats
          </p>
          <button
            type="button"
            onClick={handleStartNewChat}
            className="rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
          >
            + New
          </button>
        </div>

        <div className="mt-4 grid gap-1.5 text-sm">
          <div className="rounded-lg bg-surface-raised px-3 py-2">
            <p className="text-xs font-medium text-text-secondary">
              GitHub: {githubPatSession.orgLogin}
            </p>
            <p className="text-xs text-text-muted">
              {githubPatSession.userLogin}
            </p>
          </div>
          <div className="rounded-lg bg-surface-raised px-3 py-2">
            <p className="text-xs font-medium text-text-secondary">
              Linear: {linearApiKeySession.teamKey}
            </p>
            <p className="text-xs text-text-muted">
              {linearApiKeySession.teamName}
            </p>
          </div>
        </div>

        <nav className="mt-5 space-y-0.5">
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
      </aside>

      <main className="flex min-h-0 flex-1 flex-col bg-page py-4 lg:my-3 lg:mr-3 lg:rounded-2xl">
        <div className="flex flex-1 flex-col overflow-hidden px-4 lg:px-6">
          <MessageHistory messages={messages} />

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

          <Composer
            input={input}
            onInputChange={setInput}
            onSendMessage={handleSendMessage}
            onStop={stop}
            status={displayedStatus}
          />
        </div>
      </main>
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
