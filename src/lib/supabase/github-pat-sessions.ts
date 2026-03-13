import "server-only";
import { supabaseRequest } from "@/lib/supabase/rest";

const GITHUB_PAT_SESSIONS_TABLE = "github_pat_sessions";

export type GitHubPATSession = {
  session_id: string;
  github_pat: string;
  github_pat_expires_at: string | null;
  github_pat_last_validated_at: string;
  github_org_login: string;
  github_user_id: string;
  github_user_login: string;
  created_at: string;
  updated_at: string;
};

export async function getGitHubPATSession(sessionId: string) {
  const sessions = await supabaseRequest<GitHubPATSession[]>({
    method: "GET",
    searchParams: {
      select: "*",
      session_id: `eq.${sessionId}`,
    },
    tableName: GITHUB_PAT_SESSIONS_TABLE,
  });

  return sessions[0] ?? null;
}

export async function saveGitHubPATSession({
  githubOrgLogin,
  githubPat,
  githubPatExpiresAt,
  githubPatLastValidatedAt,
  githubUserId,
  githubUserLogin,
  sessionId,
}: {
  githubOrgLogin: string;
  githubPat: string;
  githubPatExpiresAt: string | null;
  githubPatLastValidatedAt: string;
  githubUserId: string;
  githubUserLogin: string;
  sessionId: string;
}) {
  const sessions = await supabaseRequest<GitHubPATSession[]>({
    body: {
      github_org_login: githubOrgLogin,
      github_pat: githubPat,
      github_pat_expires_at: githubPatExpiresAt,
      github_pat_last_validated_at: githubPatLastValidatedAt,
      github_user_id: githubUserId,
      github_user_login: githubUserLogin,
      session_id: sessionId,
    },
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    searchParams: {
      on_conflict: "session_id",
    },
    tableName: GITHUB_PAT_SESSIONS_TABLE,
  });

  return sessions[0] ?? null;
}
