import "server-only";
import {
  isSupabaseMissingTableError,
  supabaseRequest,
} from "@/lib/supabase/rest";

const LINEAR_API_KEY_SESSIONS_TABLE = "linear_api_key_sessions";

export type LinearApiKeySession = {
  session_id: string;
  linear_api_key: string;
  linear_api_key_expires_at: string | null;
  linear_api_key_last_validated_at: string;
  linear_team_id: string;
  linear_team_key: string;
  linear_team_name: string;
  linear_user_id: string;
  linear_user_name: string;
  created_at: string;
  updated_at: string;
};

export async function getLinearApiKeySession(sessionId: string) {
  try {
    const sessions = await supabaseRequest<LinearApiKeySession[]>({
      method: "GET",
      searchParams: {
        select: "*",
        session_id: `eq.${sessionId}`,
      },
      tableName: LINEAR_API_KEY_SESSIONS_TABLE,
    });

    return sessions[0] ?? null;
  } catch (error) {
    if (isSupabaseMissingTableError(error, LINEAR_API_KEY_SESSIONS_TABLE)) {
      return null;
    }

    throw error;
  }
}

export async function saveLinearApiKeySession({
  linearApiKey,
  linearApiKeyExpiresAt,
  linearApiKeyLastValidatedAt,
  linearTeamId,
  linearTeamKey,
  linearTeamName,
  linearUserId,
  linearUserName,
  sessionId,
}: {
  linearApiKey: string;
  linearApiKeyExpiresAt: string | null;
  linearApiKeyLastValidatedAt: string;
  linearTeamId: string;
  linearTeamKey: string;
  linearTeamName: string;
  linearUserId: string;
  linearUserName: string;
  sessionId: string;
}) {
  try {
    const sessions = await supabaseRequest<LinearApiKeySession[]>({
      body: {
        linear_api_key: linearApiKey,
        linear_api_key_expires_at: linearApiKeyExpiresAt,
        linear_api_key_last_validated_at: linearApiKeyLastValidatedAt,
        linear_team_id: linearTeamId,
        linear_team_key: linearTeamKey,
        linear_team_name: linearTeamName,
        linear_user_id: linearUserId,
        linear_user_name: linearUserName,
        session_id: sessionId,
      },
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      searchParams: {
        on_conflict: "session_id",
      },
      tableName: LINEAR_API_KEY_SESSIONS_TABLE,
    });

    return sessions[0] ?? null;
  } catch (error) {
    if (isSupabaseMissingTableError(error, LINEAR_API_KEY_SESSIONS_TABLE)) {
      throw new Error(
        "Linear storage is not initialized. Run the latest Supabase migration and try again."
      );
    }

    throw error;
  }
}
