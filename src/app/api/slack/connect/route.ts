import crypto from "node:crypto";
import { saveSlackOAuthState } from "@/lib/supabase/slack-oauth-sessions";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session_id";

function parseScopes(rawScopes?: string) {
  return rawScopes
    ?.split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean) ?? [];
}

export async function GET(request: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing SLACK_CLIENT_ID or SLACK_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const userScopes = parseScopes(process.env.SLACK_USER_SCOPES);
  if (userScopes.length === 0) {
    return NextResponse.json(
      { error: "Missing SLACK_USER_SCOPES or SLACK_BOT_SCOPES" },
      { status: 500 }
    );
  }

  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? crypto.randomUUID();
  const state = crypto.randomBytes(32).toString("hex");

  await saveSlackOAuthState(sessionId, state);

  const slackAuthorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackAuthorizeUrl.searchParams.set("client_id", clientId);
  slackAuthorizeUrl.searchParams.set("redirect_uri", redirectUri);
  slackAuthorizeUrl.searchParams.set("state", state);

  slackAuthorizeUrl.searchParams.set("user_scope", userScopes.join(","));

  const response = NextResponse.redirect(slackAuthorizeUrl);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
