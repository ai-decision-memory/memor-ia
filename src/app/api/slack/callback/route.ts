import { Buffer } from "node:buffer";
import {
  consumeSlackOAuthState,
  saveSlackAccessToken,
} from "@/lib/supabase/slack-oauth-sessions";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session_id";

type SlackUserAccessSuccessResponse = {
  ok: true;
  access_token?: string;
  authed_user?: {
    id?: string;
  };
  team?: {
    id?: string;
    name?: string;
  };
};

type SlackUserAccessErrorResponse = {
  error?: string;
  ok: false;
};

function buildAppRedirect(redirectUri: string) {
  const appOrigin = new URL(redirectUri).origin;
  return NextResponse.redirect(new URL("/", appOrigin));
}

export async function GET(request: NextRequest) {
  const slackError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!redirectUri) {
    return NextResponse.json(
      {
        error: "Missing SLACK_REDIRECT_URI",
      },
      { status: 500 }
    );
  }

  if (slackError) {
    if (sessionId && returnedState) {
      await consumeSlackOAuthState(sessionId, returnedState).catch(() => null);
    }

    return buildAppRedirect(redirectUri);
  }

  if (!code || !returnedState) {
    return buildAppRedirect(redirectUri);
  }

  if (!sessionId) {
    return buildAppRedirect(redirectUri);
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing SLACK_CLIENT_ID, SLACK_CLIENT_SECRET or SLACK_REDIRECT_URI",
      },
      { status: 500 }
    );
  }

  const consumedSession = await consumeSlackOAuthState(sessionId, returnedState);

  if (!consumedSession) {
    return buildAppRedirect(redirectUri);
  }

  const basicAuthCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenExchangeResponse = await fetch(
    "https://slack.com/api/oauth.v2.user.access",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuthCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    }
  );

  const tokenExchangePayload = (await tokenExchangeResponse.json()) as SlackUserAccessSuccessResponse | SlackUserAccessErrorResponse;

  if (!tokenExchangeResponse.ok || !tokenExchangePayload.ok || !tokenExchangePayload.access_token) {
    return buildAppRedirect(redirectUri);
  }

  const savedSession = await saveSlackAccessToken({
    sessionId,
    slackAccessToken: tokenExchangePayload.access_token,
    slackTeamId: tokenExchangePayload.team?.id ?? null,
    slackTeamName: tokenExchangePayload.team?.name ?? null,
    slackUserId: tokenExchangePayload.authed_user?.id ?? null,
  });

  if (!savedSession) {
    return buildAppRedirect(redirectUri);
  }

  return buildAppRedirect(redirectUri);
}
