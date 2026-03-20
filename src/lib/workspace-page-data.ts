import "server-only";
import { getAgentDoc, getAgentDocs } from "@/lib/supabase/agent-docs";
import { getAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import { isSupabaseMissingTableError } from "@/lib/supabase/rest";
import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { cookies } from "next/headers";

async function getSafeAgentDocs(sessionId: string) {
  try {
    return await getAgentDocs(sessionId);
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
}: {
  activeChatId?: string;
  activeDocId?: string;
} = {}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  const githubPatError = cookieStore.get("github_pat_error")?.value ?? null;
  const linearApiKeyError = cookieStore.get("linear_api_key_error")?.value ?? null;

  if (!sessionId) {
    return {
      activeChat: null,
      activeDoc: null,
      githubPatError,
      githubPatSession: null,
      linearApiKeyError,
      linearApiKeySession: null,
      sessionId: null,
      chats: [],
      docs: [],
    };
  }

  const [githubPatSession, linearApiKeySession, chats, docs, activeChat, activeDoc] =
    await Promise.all([
      getGitHubPATSession(sessionId),
      getLinearApiKeySession(sessionId),
      getAgentChats(sessionId),
      getSafeAgentDocs(sessionId),
      activeChatId
        ? getAgentChat({ chatId: activeChatId, sessionId })
        : Promise.resolve(null),
      activeDocId
        ? getSafeAgentDoc({ docId: activeDocId, sessionId })
        : Promise.resolve(null),
    ]);

  return {
    activeChat,
    activeDoc,
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
    sessionId,
  };
}
