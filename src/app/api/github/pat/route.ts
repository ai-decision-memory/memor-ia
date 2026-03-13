import crypto from "node:crypto";
import { validateGitHubPersonalAccessToken } from "@/lib/github/personal-access-token";
import { saveGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { NextRequest, NextResponse } from "next/server";

const GITHUB_PAT_ERROR_COOKIE_NAME = "github_pat_error";
const SESSION_COOKIE_NAME = "session_id";

function buildAppRedirect(request: NextRequest) {
  const appUrl = process.env.APP_URL;

  if (appUrl) {
    return NextResponse.redirect(new URL("/", appUrl));
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost && forwardedProto) {
    return NextResponse.redirect(new URL("/", `${forwardedProto}://${forwardedHost}`));
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const personalAccessToken = formData.get("personalAccessToken");
  const organizationLogin = formData.get("organizationLogin");
  const sessionId =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ?? crypto.randomUUID();

  const response = buildAppRedirect(request);

  if (
    typeof personalAccessToken !== "string" ||
    personalAccessToken.trim() === "" ||
    typeof organizationLogin !== "string" ||
    organizationLogin.trim() === ""
  ) {
    response.cookies.set({
      name: GITHUB_PAT_ERROR_COOKIE_NAME,
      value: "GitHub organization login and PAT are required.",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60,
    });
    return response;
  }

  try {
    const validationResult = await validateGitHubPersonalAccessToken({
      githubOrgLogin: organizationLogin,
      githubPersonalAccessToken: personalAccessToken.trim(),
    });

    await saveGitHubPATSession({
      githubOrgLogin: validationResult.githubOrgLogin,
      githubPat: personalAccessToken.trim(),
      githubPatExpiresAt: validationResult.githubPatExpiresAt,
      githubPatLastValidatedAt: validationResult.githubPatLastValidatedAt,
      githubUserId: validationResult.githubUserId,
      githubUserLogin: validationResult.githubUserLogin,
      sessionId,
    });

    response.cookies.delete(GITHUB_PAT_ERROR_COOKIE_NAME);
  } catch (error) {
    response.cookies.set({
      name: GITHUB_PAT_ERROR_COOKIE_NAME,
      value:
        error instanceof Error
          ? error.message
          : "GitHub PAT validation failed.",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60,
    });

    return response;
  }

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
