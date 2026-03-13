import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { getSlackOAuthSession } from "@/lib/supabase/slack-oauth-sessions";
import { cookies } from "next/headers";
import { Chat } from "./components/Chat";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  const githubPatError = cookieStore.get("github_pat_error")?.value ?? null;
  const linearApiKeyError = cookieStore.get("linear_api_key_error")?.value ?? null;
  const [slackSession, githubPatSession, linearApiKeySession] = sessionId
    ? await Promise.all([
        getSlackOAuthSession(sessionId),
        getGitHubPATSession(sessionId),
        getLinearApiKeySession(sessionId),
      ])
    : [null, null, null];
  const isSlackConnected = Boolean(slackSession?.slack_access_token);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-5xl font-bold mb-100">Slack + GitHub + Linear MCP Client</h1>
      <Chat
        githubPatError={githubPatError}
        githubPatSession={
          githubPatSession
            ? {
                orgLogin: githubPatSession.github_org_login,
                userLogin: githubPatSession.github_user_login,
              }
            : null
        }
        isSlackConnected={isSlackConnected}
        linearApiKeyError={linearApiKeyError}
        linearApiKeySession={
          linearApiKeySession
            ? {
                teamKey: linearApiKeySession.linear_team_key,
                teamName: linearApiKeySession.linear_team_name,
                userName: linearApiKeySession.linear_user_name,
              }
            : null
        }
      />
    </div>
  );
}
