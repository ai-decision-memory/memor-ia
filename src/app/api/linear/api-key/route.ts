import crypto from "node:crypto";
import { validateLinearApiKey } from "@/lib/linear/api-key";
import { saveLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { NextRequest, NextResponse } from "next/server";

const LINEAR_API_KEY_ERROR_COOKIE_NAME = "linear_api_key_error";
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
  const personalApiKey = formData.get("personalApiKey");
  const sessionId =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ?? crypto.randomUUID();

  const response = buildAppRedirect(request);

  if (typeof personalApiKey !== "string" || personalApiKey.trim() === "") {
    response.cookies.set({
      name: LINEAR_API_KEY_ERROR_COOKIE_NAME,
      value: "Linear personal API key is required.",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60,
    });
    return response;
  }

  try {
    const validationResult = await validateLinearApiKey({
      linearApiKey: personalApiKey.trim(),
    });

    await saveLinearApiKeySession({
      linearApiKey: personalApiKey.trim(),
      linearApiKeyExpiresAt: validationResult.linearApiKeyExpiresAt,
      linearApiKeyLastValidatedAt: validationResult.linearApiKeyLastValidatedAt,
      linearTeamId: validationResult.linearTeamId,
      linearTeamKey: validationResult.linearTeamKey,
      linearTeamName: validationResult.linearTeamName,
      linearUserId: validationResult.linearUserId,
      linearUserName: validationResult.linearUserName,
      sessionId,
    });

    response.cookies.delete(LINEAR_API_KEY_ERROR_COOKIE_NAME);
  } catch (error) {
    response.cookies.set({
      name: LINEAR_API_KEY_ERROR_COOKIE_NAME,
      value:
        error instanceof Error
          ? error.message
          : "Linear API key validation failed.",
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
