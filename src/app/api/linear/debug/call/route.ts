import { createLinearMCPClient } from "@/lib/mcp/linear-mcp-client";
import { sanitizeLinearToolsForChat } from "@/lib/mcp/sanitize-linear-tools";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "session_id";

type DebugToolMode = "raw" | "sanitized";

function normalizeToolName(toolName: string, mode: DebugToolMode) {
  if (mode === "raw" && toolName.startsWith("linear_")) {
    return toolName.slice("linear_".length);
  }

  if (mode === "sanitized" && !toolName.startsWith("linear_")) {
    return `linear_${toolName}`;
  }

  return toolName;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const linearApiKeySession = await getLinearApiKeySession(sessionId);

  if (!linearApiKeySession?.linear_api_key) {
    return Response.json({ error: "Linear API key not connected" }, { status: 401 });
  }

  const payload = await request.json();
  const mode =
    payload?.mode === "raw" || payload?.mode === "sanitized"
      ? (payload.mode as DebugToolMode)
      : "sanitized";
  const requestedToolName =
    typeof payload?.toolName === "string" ? payload.toolName.trim() : "";

  if (!requestedToolName) {
    return Response.json({ error: "toolName is required" }, { status: 400 });
  }

  const linearMCPClient = await createLinearMCPClient(linearApiKeySession.linear_api_key);

  try {
    const scope = {
      teamId: linearApiKeySession.linear_team_id,
      teamKey: linearApiKeySession.linear_team_key,
      teamName: linearApiKeySession.linear_team_name,
    };
    const definitions = await linearMCPClient.listTools();
    const rawTools = linearMCPClient.toolsFromDefinitions(definitions) as Record<
      string,
      Record<string, unknown>
    >;
    const toolSet =
      mode === "raw" ? rawTools : sanitizeLinearToolsForChat(rawTools, scope);
    const normalizedToolName = normalizeToolName(requestedToolName, mode);
    const tool = toolSet[normalizedToolName];

    if (!tool || typeof tool.execute !== "function") {
      return Response.json(
        {
          error: `Tool not found in ${mode} tool set`,
          mode,
          toolName: normalizedToolName,
        },
        { status: 404 }
      );
    }

    const input = isRecord(payload?.input) ? payload.input : {};
    const result = await tool.execute(input, {
      messages: [],
      toolCallId: `linear-debug-${Date.now()}`,
    });

    return Response.json({
      input,
      mode,
      result,
      toolName: normalizedToolName,
    });
  } finally {
    await linearMCPClient.close();
  }
}
