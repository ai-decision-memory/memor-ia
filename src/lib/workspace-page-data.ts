import "server-only";
import { getAgentPinnedPrompts } from "@/lib/supabase/agent-pinned-prompts";
import { getAgentDoc, getAgentDocs } from "@/lib/supabase/agent-docs";
import { getAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import {
  ensureAgentWorkspace,
  getAgentWorkspace,
} from "@/lib/supabase/agent-workspaces";
import { isSupabaseMissingTableError } from "@/lib/supabase/rest";
import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { cookies } from "next/headers";

async function getSafeAgentWorkspaces(sessionId: string) {
  try {
    return await ensureAgentWorkspace(sessionId);
  } catch (error) {
    if (isSupabaseMissingTableError(error, "agent_workspaces")) {
      return [];
    }

    throw error;
  }
}

async function getSafeAgentWorkspace({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId: string;
}) {
  try {
    return await getAgentWorkspace({
      sessionId,
      workspaceId,
    });
  } catch (error) {
    if (isSupabaseMissingTableError(error, "agent_workspaces")) {
      return null;
    }

    throw error;
  }
}

async function getSafeAgentPinnedPrompts({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId: string;
}) {
  try {
    return await getAgentPinnedPrompts({
      sessionId,
      workspaceId,
    });
  } catch (error) {
    if (isSupabaseMissingTableError(error, "agent_pinned_prompts")) {
      return [];
    }

    throw error;
  }
}

async function getSafeAgentDocs({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId: string;
}) {
  try {
    return await getAgentDocs({
      sessionId,
      workspaceId,
    });
  } catch (error) {
    if (isSupabaseMissingTableError(error, "agent_docs")) {
      return [];
    }

    throw error;
  }
}

async function getSafeAgentDoc({
  docId,
  sessionId,
}: {
  docId: string;
  sessionId: string;
}) {
  try {
    return await getAgentDoc({
      docId,
      sessionId,
    });
  } catch (error) {
    if (isSupabaseMissingTableError(error, "agent_docs")) {
      return null;
    }

    throw error;
  }
}

export async function getWorkspacePageData({
  activeChatId,
  activeDocId,
  activeWorkspaceId,
}: {
  activeChatId?: string;
  activeDocId?: string;
  activeWorkspaceId?: string;
} = {}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  const githubPatError = cookieStore.get("github_pat_error")?.value ?? null;
  const linearApiKeyError = cookieStore.get("linear_api_key_error")?.value ?? null;

  if (!sessionId) {
    return {
      activeChat: null,
      activeDoc: null,
      activeWorkspace: null,
      githubPatError,
      githubPatSession: null,
      linearApiKeyError,
      linearApiKeySession: null,
      pinnedPrompts: [],
      sessionId: null,
      chats: [],
      docs: [],
      workspaces: [],
    };
  }

  const [githubPatSession, linearApiKeySession, workspaces, activeChat, activeDoc] =
    await Promise.all([
      getGitHubPATSession(sessionId),
      getLinearApiKeySession(sessionId),
      getSafeAgentWorkspaces(sessionId),
      activeChatId
        ? getAgentChat({ chatId: activeChatId, sessionId })
        : Promise.resolve(null),
      activeDocId
        ? getSafeAgentDoc({ docId: activeDocId, sessionId })
        : Promise.resolve(null),
    ]);

  const fallbackWorkspace = workspaces[0] ?? null;
  const activeWorkspaceFromChat = activeChat?.workspace_id
    ? workspaces.find((workspace) => workspace.id === activeChat.workspace_id) ?? null
    : null;
  const activeWorkspaceFromDoc = activeDoc?.workspace_id
    ? workspaces.find((workspace) => workspace.id === activeDoc.workspace_id) ?? null
    : null;
  const requestedWorkspace = activeWorkspaceId
    ? await getSafeAgentWorkspace({
        sessionId,
        workspaceId: activeWorkspaceId,
      })
    : null;
  const activeWorkspace =
    activeWorkspaceFromChat ??
    activeWorkspaceFromDoc ??
    requestedWorkspace ??
    fallbackWorkspace;
  const resolvedActiveWorkspace =
    activeWorkspace && "session_id" in activeWorkspace
      ? {
          created_at: activeWorkspace.created_at,
          id: activeWorkspace.id,
          title: activeWorkspace.title,
          updated_at: activeWorkspace.updated_at,
        }
      : activeWorkspace;
  const resolvedWorkspaceId = resolvedActiveWorkspace?.id ?? fallbackWorkspace?.id ?? null;
  const [chats, docs, pinnedPrompts] = resolvedWorkspaceId
    ? await Promise.all([
        getAgentChats({
          sessionId,
          workspaceId: resolvedWorkspaceId,
        }),
        getSafeAgentDocs({
          sessionId,
          workspaceId: resolvedWorkspaceId,
        }),
        getSafeAgentPinnedPrompts({
          sessionId,
          workspaceId: resolvedWorkspaceId,
        }),
      ])
    : [[], [], []];

  return {
    activeChat,
    activeDoc,
    activeWorkspace: resolvedActiveWorkspace,
    chats,
    docs,
    githubPatError,
    githubPatSession: githubPatSession
      ? {
          orgLogin: githubPatSession.github_org_login,
          userLogin: githubPatSession.github_user_login,
        }
      : null,
    linearApiKeyError,
    linearApiKeySession: linearApiKeySession
      ? {
          teamKey: linearApiKeySession.linear_team_key,
          teamName: linearApiKeySession.linear_team_name,
          userName: linearApiKeySession.linear_user_name,
        }
      : null,
    pinnedPrompts,
    sessionId,
    workspaces,
  };
}
