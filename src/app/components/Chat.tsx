"use client";

import { buildChatTitleFromMessages } from "@/lib/chats/title";
import { buildDocFileName } from "@/lib/docs/title";
import type {
  AgentDocKind,
  AgentDocSummary,
  DocGenerationClarification,
} from "@/lib/docs/types";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";
import { useChatWorkspace } from "./ChatWorkspaceProvider";
import type { TemporaryChat } from "./ChatWorkspaceProvider";
import { Composer } from "./Composer";
import { MarkdownDocument } from "./MarkdownDocument";
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

type PersistedDoc = AgentDocSummary & {
  content: string;
  source_chat_id: string | null;
};

type SidebarMenuState =
  | {
      id: string;
      kind: "chat" | "doc";
    }
  | null;

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
  children: ReactNode;
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

function RenameItemModal({
  itemLabel,
  currentTitle,
  onClose,
  onRename,
}: {
  itemLabel: string;
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
      <p className="text-sm font-medium text-text-primary">Rename {itemLabel}</p>
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

function DeleteItemModal({
  description,
  itemLabel,
  onClose,
  onConfirm,
}: {
  description: string;
  itemLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConnectionModal onClose={onClose}>
      <p className="text-sm font-medium text-text-primary">Delete {itemLabel}</p>
      <p className="mt-2 text-xs text-text-muted">{description}</p>
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

function GenerateDocsClarificationModal({
  answer,
  error,
  onAnswerChange,
  onClose,
  onSubmit,
  question,
  submitting,
}: {
  answer: string;
  error: string | null;
  onAnswerChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  question: string;
  submitting: boolean;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <ConnectionModal onClose={onClose}>
      <p className="text-sm font-medium text-text-primary">Clarify the doc</p>
      <p className="mt-2 text-sm text-text-secondary">{question}</p>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-950/40 p-2 text-xs text-red-400">{error}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg bg-page px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
          placeholder="Describe the feature or area to document, and say whether the doc should be technical or user-facing."
          autoFocus
        />
        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!answer.trim() || submitting}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-text transition hover:opacity-80 disabled:opacity-40"
          >
            {submitting ? "Generating..." : "Continue"}
          </button>
        </div>
      </form>
    </ConnectionModal>
  );
}

function formatDocKindLabel(kind: AgentDocKind) {
  return kind === "user-facing" ? "User-facing" : "Technical";
}

function getItemLabel(kind: "chat" | "doc") {
  return kind === "chat" ? "chat" : "doc";
}

export const Chat = ({
  activeChat,
  activeDoc,
  chats,
  docs,
  githubPatError,
  githubPatSession,
  linearApiKeyError,
  linearApiKeySession,
}: {
  activeChat: PersistedChat | null;
  activeDoc: PersistedDoc | null;
  chats: ChatSummary[];
  docs: AgentDocSummary[];
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
  const [sidebarDocs, setSidebarDocs] = useState<AgentDocSummary[]>(docs);
  const [transientPersistedChat, setTransientPersistedChat] =
    useState<PersistedChat | null>(null);
  const [openMenu, setOpenMenu] = useState<SidebarMenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [openModal, setOpenModal] = useState<"github" | "linear" | null>(
    githubPatError ? "github" : linearApiKeyError ? "linear" : null,
  );
  const [renamingItem, setRenamingItem] = useState<SidebarMenuState>(null);
  const [deletingItem, setDeletingItem] = useState<SidebarMenuState>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [docClarificationAnswer, setDocClarificationAnswer] = useState("");
  const [docClarificationError, setDocClarificationError] = useState<string | null>(null);
  const [docClarificationQuestion, setDocClarificationQuestion] =
    useState<string | null>(null);
  const [docClarifications, setDocClarifications] = useState<
    DocGenerationClarification[]
  >([]);

  const closeSidebarMenu = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeSidebarMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeSidebarMenu, openMenu]);

  const allConnected = !!githubPatSession && !!linearApiKeySession;

  const isDocView = !!activeDoc;
  const activePersistedChat =
    isDocView ? null : transientPersistedChat ?? activeChat;
  const resolvedActiveChat =
    isDocView ? null : activePersistedChat ?? temporaryChat;
  const resolvedActiveDoc = useMemo(() => {
    if (!activeDoc) {
      return null;
    }

    const matchingSidebarDoc = sidebarDocs.find((doc) => doc.id === activeDoc.id);

    return matchingSidebarDoc
      ? {
          ...activeDoc,
          ...matchingSidebarDoc,
        }
      : activeDoc;
  }, [activeDoc, sidebarDocs]);
  const isTemporaryChatActive = !isDocView && !activePersistedChat && !!temporaryChat;
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

  const updateSidebarDoc = (docId: string, updater: (doc: AgentDocSummary) => AgentDocSummary) => {
    setSidebarDocs((currentDocs) =>
      currentDocs.map((doc) => (doc.id === docId ? updater(doc) : doc)),
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

  const persistDocTitle = async ({
    docId,
    title,
  }: {
    docId: string;
    title: string;
  }) => {
    const response = await fetch(`/api/docs/${docId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to update doc title");
    }

    const payload = (await response.json()) as {
      doc: AgentDocSummary;
    };

    return payload.doc;
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
    setSidebarDocs(docs);
  }, [docs]);

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
  const canGenerateDocs =
    !isDocView &&
    messages.length > 0 &&
    displayedStatus !== "streaming" &&
    displayedStatus !== "submitted" &&
    !isGeneratingDoc;

  const resetDocGenerationState = () => {
    setDocClarificationAnswer("");
    setDocClarificationError(null);
    setDocClarificationQuestion(null);
    setDocClarifications([]);
    setIsGeneratingDoc(false);
  };

  const resetDraftState = () => {
    stop();
    setClientError(null);
    setInput("");
    setPendingInitialPrompt(null);
    resetDocGenerationState();
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
    setDeletingItem(null);
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

  const handleDeleteDoc = async (docId: string) => {
    setDeletingItem(null);
    setClientError(null);

    setSidebarDocs((currentDocs) =>
      currentDocs.filter((doc) => doc.id !== docId),
    );

    if (resolvedActiveDoc?.id === docId) {
      router.push("/");
    }

    try {
      const response = await fetch(`/api/docs/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to delete doc");
      }
    } catch (deleteError) {
      setClientError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete doc",
      );
    }
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    const chat = sidebarChats.find((c) => c.id === chatId);
    setRenamingItem(null);

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

  const handleRenameDoc = (docId: string, newTitle: string) => {
    const doc = sidebarDocs.find((item) => item.id === docId);
    setRenamingItem(null);

    if (!newTitle || newTitle.trim() === "" || newTitle === doc?.title) {
      return;
    }

    const trimmedTitle = newTitle.trim();
    updateSidebarDoc(docId, (currentDoc) => ({
      ...currentDoc,
      title: trimmedTitle,
    }));

    persistDocTitle({ docId, title: trimmedTitle }).catch((renameError) => {
      if (doc) {
        updateSidebarDoc(docId, () => doc);
      }

      setClientError(
        renameError instanceof Error
          ? renameError.message
          : "Failed to rename doc",
      );
    });
  };

  const handleGenerateDoc = async (
    clarifications: DocGenerationClarification[] = docClarifications,
  ) => {
    if (!canGenerateDocs && clarifications.length === 0) {
      return;
    }

    setClientError(null);
    setDocClarificationError(null);
    setIsGeneratingDoc(true);

    try {
      const response = await fetch("/api/docs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: activePersistedChat?.id ?? temporaryChat?.id ?? null,
          clarifications,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to generate doc");
      }

      const payload = (await response.json()) as
        | {
            question: string;
            status: "needs_clarification";
          }
        | {
            doc: AgentDocSummary & {
              source_chat_id: string | null;
            };
            status: "created";
          };

      if (payload.status === "needs_clarification") {
        setDocClarificationQuestion(payload.question);
        return;
      }

      setSidebarDocs((currentDocs) => [
        {
          created_at: payload.doc.created_at,
          id: payload.doc.id,
          kind: payload.doc.kind,
          title: payload.doc.title,
          updated_at: payload.doc.updated_at,
        },
        ...currentDocs.filter((doc) => doc.id !== payload.doc.id),
      ]);
      resetDocGenerationState();
      router.push(`/docs/${payload.doc.id}`);
    } catch (generationError) {
      const errorMessage =
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate doc";

      if (docClarificationQuestion) {
        setDocClarificationError(errorMessage);
      } else {
        setClientError(errorMessage);
      }
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleSubmitDocClarification = async () => {
    if (!docClarificationQuestion || !docClarificationAnswer.trim()) {
      return;
    }

    const nextClarifications = [
      ...docClarifications,
      {
        answer: docClarificationAnswer.trim(),
        question: docClarificationQuestion,
      },
    ];

    setDocClarificationAnswer("");
    setDocClarifications(nextClarifications);
    await handleGenerateDoc(nextClarifications);
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
          {sidebarChats.length === 0 && !temporaryChat ? (
            <div className="px-3 py-6 text-sm text-text-muted">
              No chats yet.
            </div>
          ) : (
            sidebarChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isMenuOpen =
                openMenu?.kind === "chat" && openMenu.id === chat.id;

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
                  </Link>
                  <div
                    className="relative self-center shrink-0"
                    ref={isMenuOpen ? menuRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(
                          isMenuOpen ? null : { id: chat.id, kind: "chat" },
                        );
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-sm leading-none text-text-muted transition hover:text-text-primary"
                    >
                      &#x22EF;
                    </button>
                    {isMenuOpen ? (
                      <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg bg-page py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            setRenamingItem({ id: chat.id, kind: "chat" });
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:text-text-primary"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            setDeletingItem({ id: chat.id, kind: "chat" });
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

          <div className="mt-6 border-t border-border-subtle pt-4">
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Docs
              </p>
              <span className="text-[11px] text-text-muted">
                {sidebarDocs.length}
              </span>
            </div>

            {sidebarDocs.length === 0 ? (
              <div className="px-3 py-3 text-sm text-text-muted">
                Generated docs will appear here.
              </div>
            ) : (
              sidebarDocs.map((doc) => {
                const isActive = resolvedActiveDoc?.id === doc.id;
                const isMenuOpen =
                  openMenu?.kind === "doc" && openMenu.id === doc.id;

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                      isActive
                        ? "bg-page text-text-primary"
                        : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    }`}
                  >
                    <Link href={`/docs/${doc.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <TextScramble>{buildDocFileName(doc.title)}</TextScramble>
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                        <span>{formatDocKindLabel(doc.kind)}</span>
                        <span>{formatRelativeTimestamp(doc.updated_at)}</span>
                      </div>
                    </Link>
                    <div
                      className="relative self-center shrink-0"
                      ref={isMenuOpen ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenu(
                            isMenuOpen ? null : { id: doc.id, kind: "doc" },
                          );
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-sm leading-none text-text-muted transition hover:text-text-primary"
                      >
                        &#x22EF;
                      </button>
                      {isMenuOpen ? (
                        <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg bg-page py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              setRenamingItem({ id: doc.id, kind: "doc" });
                            }}
                            className="block w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:text-text-primary"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              setDeletingItem({ id: doc.id, kind: "doc" });
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
          </div>
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
        {isDocView && resolvedActiveDoc ? (
          <>
            <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4 border-b border-border-subtle pb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Generated Doc
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-text-primary">
                  {buildDocFileName(resolvedActiveDoc.title)}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="rounded-full border border-border-strong px-2 py-1">
                    {formatDocKindLabel(resolvedActiveDoc.kind)}
                  </span>
                  <span>Updated {formatRelativeTimestamp(resolvedActiveDoc.updated_at)}</span>
                  {resolvedActiveDoc.source_chat_id ? (
                    <Link
                      href={`/chats/${resolvedActiveDoc.source_chat_id}`}
                      className="text-text-secondary underline decoration-text-muted underline-offset-4 transition hover:text-text-primary hover:decoration-text-primary"
                    >
                      Open source chat
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pt-6">
              <div className="mx-auto w-full max-w-4xl pb-10">
                <MarkdownDocument content={resolvedActiveDoc.content} />
              </div>
            </div>

            {clientError ? (
              <p className="mx-auto mt-2 w-full max-w-4xl rounded-lg bg-red-950/40 p-3 text-sm text-red-400">
                {clientError}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex w-full max-w-3xl items-center justify-between gap-3">
              <div className="min-w-0">
                {isTemporaryChatActive ? (
                  <div className="flex items-center gap-3">
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
                ) : (
                  <p className="text-xs text-text-muted">
                    Turn the current conversation into a saved markdown doc when the scope is clear.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleGenerateDoc()}
                disabled={!canGenerateDocs}
                className="shrink-0 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGeneratingDoc ? "Generating..." : "Generate docs"}
              </button>
            </div>

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
          </>
        )}
      </main>

      {openModal === "github" ? <GitHubModal onClose={() => setOpenModal(null)} serverError={githubPatError} /> : null}
      {openModal === "linear" ? <LinearModal onClose={() => setOpenModal(null)} serverError={linearApiKeyError} /> : null}

      {renamingItem ? (
        <RenameItemModal
          itemLabel={getItemLabel(renamingItem.kind)}
          currentTitle={
            renamingItem.kind === "chat"
              ? sidebarChats.find((chat) => chat.id === renamingItem.id)?.title ?? ""
              : sidebarDocs.find((doc) => doc.id === renamingItem.id)?.title ?? ""
          }
          onClose={() => setRenamingItem(null)}
          onRename={(title) =>
            renamingItem.kind === "chat"
              ? handleRenameChat(renamingItem.id, title)
              : handleRenameDoc(renamingItem.id, title)
          }
        />
      ) : null}

      {deletingItem ? (
        <DeleteItemModal
          description={
            deletingItem.kind === "chat"
              ? "This will permanently delete this chat and all its messages."
              : "This will permanently delete this generated markdown doc."
          }
          itemLabel={getItemLabel(deletingItem.kind)}
          onClose={() => setDeletingItem(null)}
          onConfirm={() =>
            void (
              deletingItem.kind === "chat"
                ? handleDeleteChat(deletingItem.id)
                : handleDeleteDoc(deletingItem.id)
            )
          }
        />
      ) : null}

      {docClarificationQuestion ? (
        <GenerateDocsClarificationModal
          answer={docClarificationAnswer}
          error={docClarificationError}
          onAnswerChange={setDocClarificationAnswer}
          onClose={resetDocGenerationState}
          onSubmit={() => void handleSubmitDocClarification()}
          question={docClarificationQuestion}
          submitting={isGeneratingDoc}
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
