import "server-only";
import { supabaseRequest } from "@/lib/supabase/rest";

const SLACK_OAUTH_SESSIONS_TABLE = "slack_oauth_sessions";

export type SlackOAuthSession = {
  session_id: string;
  oauth_state: string | null;
  slack_access_token: string | null;
  slack_user_id: string | null;
  slack_team_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSlackOAuthSession(sessionId: string) {
  const sessions = await supabaseRequest<SlackOAuthSession[]>({
    method: "GET",
    searchParams: {
      select: "*",
      session_id: `eq.${sessionId}`,
    },
    tableName: SLACK_OAUTH_SESSIONS_TABLE,
  });

  return sessions[0] ?? null;
}

export async function saveSlackOAuthState(sessionId: string, oauthState: string) {
  const upsertedSessions = await supabaseRequest<SlackOAuthSession[]>({
    body: {
      oauth_state: oauthState,
      session_id: sessionId,
    },
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    searchParams: {
      on_conflict: "session_id",
    },
    tableName: SLACK_OAUTH_SESSIONS_TABLE,
  });

  return upsertedSessions[0] ?? null;
}

export async function consumeSlackOAuthState(sessionId: string, oauthState: string) {
  const consumedSessions = await supabaseRequest<SlackOAuthSession[]>({
    body: {
      oauth_state: null,
    },
    method: "PATCH",
    prefer: "return=representation",
    searchParams: {
      oauth_state: `eq.${oauthState}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: SLACK_OAUTH_SESSIONS_TABLE,
  });

  return consumedSessions[0] ?? null;
}

export async function saveSlackAccessToken({ sessionId, slackAccessToken, slackTeamId, slackUserId }: 
  { sessionId: string; slackAccessToken: string; slackTeamId: string | null; slackUserId: string | null }) {
  const updatedSessions = await supabaseRequest<SlackOAuthSession[]>({
    body: {
      slack_access_token: slackAccessToken,
      slack_team_id: slackTeamId,
      slack_user_id: slackUserId,
    },
    method: "PATCH",
    prefer: "return=representation",
    searchParams: {
      session_id: `eq.${sessionId}`,
    },
    tableName: SLACK_OAUTH_SESSIONS_TABLE,
  });

  return updatedSessions[0] ?? null;
}
