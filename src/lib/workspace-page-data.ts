import "server-only";
import { getAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import { getAgentDoc, getAgentDocs } from "@/lib/supabase/agent-docs";
import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { ensureAgentWorkspace } from "@/lib/supabase/agent-workspaces";
import { cookies } from "next/headers";

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

  const workspaces = await ensureAgentWorkspace(sessionId);
  const workspace = workspaces[0];

  if (!workspace) {
    const [githubPatSession, linearApiKeySession, activeChat, chats] =
      await Promise.all([
        getGitHubPATSession(sessionId),
        getLinearApiKeySession(sessionId),
        activeChatId
          ? getAgentChat({ chatId: activeChatId, sessionId })
          : Promise.resolve(null),
        getAgentChats({ sessionId }),
      ]);

    return {
      activeChat,
      activeDoc: null,
      chats,
      docs: [],
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

  const [githubPatSession, linearApiKeySession, activeChat, activeDoc, chats, docs] =
    await Promise.all([
      getGitHubPATSession(sessionId),
      getLinearApiKeySession(sessionId),
      activeChatId
        ? getAgentChat({ chatId: activeChatId, sessionId })
        : Promise.resolve(null),
      activeDocId
        ? getAgentDoc({ docId: activeDocId, sessionId })
        : Promise.resolve(null),
      getAgentChats({ sessionId, workspaceId: workspace.id }),
      getAgentDocs({ sessionId, workspaceId: workspace.id }),
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
