import "server-only";
import { getAgentChat, getAgentChats } from "@/lib/supabase/agent-chats";
import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { cookies } from "next/headers";

export async function getWorkspacePageData(activeChatId?: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  const githubPatError = cookieStore.get("github_pat_error")?.value ?? null;
  const linearApiKeyError = cookieStore.get("linear_api_key_error")?.value ?? null;

  if (!sessionId) {
    return {
      activeChat: null,
      githubPatError,
      githubPatSession: null,
      linearApiKeyError,
      linearApiKeySession: null,
      sessionId: null,
      chats: [],
    };
  }

  const [githubPatSession, linearApiKeySession, chats, activeChat] =
    await Promise.all([
      getGitHubPATSession(sessionId),
      getLinearApiKeySession(sessionId),
      getAgentChats(sessionId),
      activeChatId ? getAgentChat({ chatId: activeChatId, sessionId }) : Promise.resolve(null),
    ]);

  return {
    activeChat,
    chats,
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
