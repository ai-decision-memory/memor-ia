"use client";

import { buildChatTitleFromMessages } from "@/lib/chats/title";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { useChatWorkspace } from "./ChatWorkspaceProvider";
import type { TemporaryChat } from "./ChatWorkspaceProvider";
import { Composer } from "./Composer";
import { MessageHistory } from "./MessageHistory";
import { TextScramble } from "./TextScramble";

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
const TEMP_CHAT_ID_PREFIX = "temp-chat-";
const TEMPORARY_CHAT_TITLE = "Temporary chat";

function createTemporaryChat(): TemporaryChat {
  const now = new Date().toISOString();

  return {
    created_at: now,
    id: `${TEMP_CHAT_ID_PREFIX}${crypto.randomUUID()}`,
    messages: [],
    title: TEMPORARY_CHAT_TITLE,
    updated_at: now,
  };
}

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

function RenameChatModal({
  currentTitle,
  onClose,
  onRename,
}: {
  currentTitle: string;
  onClose: () => void;
  onRename: (title: string) => void;
}) {
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onRename(title);
  };

  return (
    <ConnectionModal onClose={onClose}>
      <p className="text-sm font-medium text-text-primary">Rename chat</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-page px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
          autoFocus
        />
        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
          <button type="submit" disabled={!title.trim()}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-text transition hover:opacity-80 disabled:opacity-40">
            Save
          </button>
        </div>
      </form>
    </ConnectionModal>
  );
}

function DeleteChatModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConnectionModal onClose={onClose}>
      <p className="text-sm font-medium text-text-primary">Delete chat</p>
      <p className="mt-2 text-xs text-text-muted">This will permanently delete this chat and all its messages.</p>
      <div className="mt-4 flex items-center justify-end gap-3">
        <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
        <button type="button" onClick={onConfirm}
          className="rounded-lg bg-red-500/20 px-4 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30">
          Delete
        </button>
      </div>
    </ConnectionModal>
  );
}

export const Chat = ({
  activeChat,
  chats,
  githubPatError,
  githubPatSession,
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
  linearApiKeyError: string | null;
  linearApiKeySession: {
    teamKey: string;
    teamName: string;
    userName: string;
  } | null;
}) => {
  const router = useRouter();
  const { clearTemporaryChat, setTemporaryChat, temporaryChat } = useChatWorkspace();
  const [clientError, setClientError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isPersistingChat, setIsPersistingChat] = useState(false);
  const [isStartingTemporaryChat, setIsStartingTemporaryChat] = useState(false);
  const [pendingInitialPrompt, setPendingInitialPrompt] = useState<string | null>(null);
  const [sidebarChats, setSidebarChats] = useState<ChatSummary[]>(chats);
  const [transientPersistedChat, setTransientPersistedChat] =
    useState<PersistedChat | null>(null);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const [openModal, setOpenModal] = useState<"github" | "linear" | null>(
    githubPatError ? "github" : linearApiKeyError ? "linear" : null,
  );
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [deletingConfirmChatId, setDeletingConfirmChatId] = useState<string | null>(null);

  const closeChatMenu = useCallback(() => setChatMenuId(null), []);

  useEffect(() => {
    if (!chatMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        closeChatMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [chatMenuId, closeChatMenu]);

  const allConnected = !!githubPatSession && !!linearApiKeySession;

  const activePersistedChat = transientPersistedChat ?? activeChat;
  const resolvedActiveChat = activePersistedChat ?? temporaryChat;
  const isTemporaryChatActive = !activePersistedChat && !!temporaryChat;
  const activeChatId = resolvedActiveChat?.id ?? null;
  const initialMessages = useMemo(
    () => resolvedActiveChat?.messages ?? [],
    [resolvedActiveChat?.messages],
  );
  const chatStatus =
    isPersistingChat || isStartingTemporaryChat ? "submitted" : undefined;

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
    onFinish: async () => {},
  });

  useEffect(() => {
    setSidebarChats(chats);
  }, [chats]);

  useEffect(() => {
    if (activeChat?.id) {
      setTransientPersistedChat(null);
    }
  }, [activeChat?.id]);

  useEffect(() => {
    if (!temporaryChat || activeChatId !== temporaryChat.id) {
      return;
    }

    setTemporaryChat((currentChat) => {
      if (!currentChat || currentChat.id !== temporaryChat.id) {
        return currentChat;
      }

      const nextTitle =
        messages.length > 0
          ? buildChatTitleFromMessages(messages)
          : currentChat.title;
      const didMessagesChange = currentChat.messages !== messages;

      if (!didMessagesChange && currentChat.title === nextTitle) {
        return currentChat;
      }

      return {
        ...currentChat,
        messages,
        title: nextTitle,
        updated_at: didMessagesChange ? new Date().toISOString() : currentChat.updated_at,
      };
    });
  }, [activeChatId, messages, setTemporaryChat, temporaryChat]);

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
  const canPersistTemporaryChat =
    isTemporaryChatActive &&
    messages.length > 0 &&
    displayedStatus !== "streaming" &&
    displayedStatus !== "submitted" &&
    !isPersistingChat;

  const resetDraftState = () => {
    stop();
    setClientError(null);
    setInput("");
    setPendingInitialPrompt(null);
    clearTemporaryChat();
    setTransientPersistedChat(null);
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

  const handleCreateChat = async ({
    messages: nextMessages,
    title,
  }: {
    messages?: UIMessage[];
    title?: string;
  } = {}) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(Array.isArray(nextMessages) ? { messages: nextMessages } : {}),
        ...(title ? { title } : {}),
      }),
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

    if (activePersistedChat?.id) {
      moveChatToTop(activePersistedChat.id);
      await sendMessage({ text });
      return;
    }

    if (temporaryChat) {
      await sendMessage({ text });
      return;
    }

    if (isStartingTemporaryChat) {
      return;
    }

    setIsStartingTemporaryChat(true);

    try {
      setTemporaryChat(createTemporaryChat());
      setPendingInitialPrompt(text);
    } catch (createError) {
      setClientError(
        createError instanceof Error
          ? createError.message
          : "Failed to start temporary chat",
      );
    } finally {
      setIsStartingTemporaryChat(false);
    }
  };

  const handlePersistChat = async () => {
    if (!temporaryChat || messages.length === 0) {
      return;
    }

    setClientError(null);
    setIsPersistingChat(true);

    try {
      const title = buildChatTitleFromMessages(messages);
      const createdChat = await handleCreateChat({
        messages,
        title,
      });

      setSidebarChats((currentChats) => [
        createdChat,
        ...currentChats.filter((chat) => chat.id !== createdChat.id),
      ]);
      setTransientPersistedChat({
        ...createdChat,
        messages,
      });
      clearTemporaryChat();
      window.history.replaceState(null, "", `/chats/${createdChat.id}`);
    } catch (persistError) {
      setClientError(
        persistError instanceof Error
          ? persistError.message
          : "Failed to persist chat",
      );
    } finally {
      setIsPersistingChat(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    setDeletingConfirmChatId(null);
    setClientError(null);

    setSidebarChats((currentChats) =>
      currentChats.filter((chat) => chat.id !== chatId),
    );

    if (activeChatId === chatId) {
      router.push("/");
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to delete chat");
      }
    } catch (deleteError) {
      setClientError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete chat",
      );
    }
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    const chat = sidebarChats.find((c) => c.id === chatId);
    setRenamingChatId(null);

    if (!newTitle || newTitle.trim() === "" || newTitle === chat?.title) {
      return;
    }

    const trimmedTitle = newTitle.trim();
    updateSidebarChatTitle(chatId, trimmedTitle);

    persistChatTitle({ chatId, title: trimmedTitle }).catch((renameError) => {
      if (chat) updateSidebarChatTitle(chatId, chat.title);
      setClientError(
        renameError instanceof Error
          ? renameError.message
          : "Failed to rename chat",
      );
    });
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
                    <p className="truncate text-sm">
                      <TextScramble>{chat.title}</TextScramble>
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatRelativeTimestamp(chat.updated_at)}
                    </p>
                  </Link>
                  <div className="relative self-center shrink-0" ref={chatMenuId === chat.id ? chatMenuRef : undefined}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMenuId(chatMenuId === chat.id ? null : chat.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-sm leading-none text-text-muted transition hover:text-text-primary"
                    >
                      &#x22EF;
                    </button>
                    {chatMenuId === chat.id ? (
                      <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg bg-page py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setChatMenuId(null);
                            setRenamingChatId(chat.id);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:text-text-primary"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChatMenuId(null);
                            setDeletingConfirmChatId(chat.id);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          {temporaryChat ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              className={`mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left transition ${
                isTemporaryChatActive
                  ? "border-text-secondary bg-page text-text-primary"
                  : "border-border-strong text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm">{temporaryChat.title}</p>
                  <span className="rounded-full border border-border-strong px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
                    Temp
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  Discarded on reload
                </p>
              </div>
            </button>
          ) : null}
        </nav>

        <div className="group mt-3 shrink-0 rounded-xl transition-colors duration-300 hover:bg-page">
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-in-out group-hover:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="space-y-2.5 px-3 pt-3 pb-2">
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
        {isTemporaryChatActive ? (
          <div className="mx-auto mb-3 flex w-full max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => void handlePersistChat()}
              disabled={!canPersistTemporaryChat}
              className="rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPersistingChat ? "Persisting..." : "Persist chat"}
            </button>
            <p className="text-xs text-text-muted">
              This conversation is temporary until you persist it.
            </p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <MessageHistory messages={messages} status={displayedStatus} />
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

      {renamingChatId ? (
        <RenameChatModal
          currentTitle={sidebarChats.find((c) => c.id === renamingChatId)?.title ?? ""}
          onClose={() => setRenamingChatId(null)}
          onRename={(title) => handleRenameChat(renamingChatId, title)}
        />
      ) : null}

      {deletingConfirmChatId ? (
        <DeleteChatModal
          onClose={() => setDeletingConfirmChatId(null)}
          onConfirm={() => void handleDeleteChat(deletingConfirmChatId)}
        />
      ) : null}
    </div>
  );
};

function formatRelativeTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
