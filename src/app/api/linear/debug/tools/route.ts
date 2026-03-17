import { createLinearMCPClient } from "@/lib/mcp/linear-mcp-client";
import {
  inspectLinearToolsForChat,
  sanitizeLinearToolsForChat,
} from "@/lib/mcp/sanitize-linear-tools";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "session_id";

type RawLinearToolDefinition = {
  annotations?: {
    title?: string;
  };
  description?: string;
  inputSchema?: unknown;
  name: string;
  title?: string;
};

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const linearApiKeySession = await getLinearApiKeySession(sessionId);

  if (!linearApiKeySession?.linear_api_key) {
    return Response.json({ error: "Linear API key not connected" }, { status: 401 });
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
    const inspections = inspectLinearToolsForChat(rawTools, scope);
    const inspectionsByToolName = new Map(
      inspections.map((inspection) => [inspection.toolName, inspection])
    );
    const sanitizedTools = sanitizeLinearToolsForChat(rawTools, scope);
    const rawToolDefinitions = definitions.tools as RawLinearToolDefinition[];

    return Response.json({
      connectedLinear: {
        teamId: linearApiKeySession.linear_team_id,
        teamKey: linearApiKeySession.linear_team_key,
        teamName: linearApiKeySession.linear_team_name,
        userName: linearApiKeySession.linear_user_name,
      },
      counts: {
        excluded: rawToolDefinitions.length - Object.keys(sanitizedTools).length,
        raw: rawToolDefinitions.length,
        shared: Object.keys(sanitizedTools).length,
      },
      rawTools: rawToolDefinitions.map((definition) => {
        const inspection = inspectionsByToolName.get(definition.name);

        return {
          allowed: inspection?.allowed ?? false,
          blockedPatterns: inspection?.blockedPatterns ?? [],
          description: definition.description?.trim() ?? null,
          exposedToolName: inspection?.exposedToolName ?? null,
          inputSchema: definition.inputSchema ?? null,
          isMemberTool: inspection?.isMemberTool ?? false,
          matchedActions: inspection?.matchedActions ?? [],
          matchedSubjects: inspection?.matchedSubjects ?? [],
          name: definition.name,
          scopedFieldValues: inspection?.scopedFieldValues ?? {},
          scopedFields: inspection?.scopedFields ?? [],
          title: definition.title ?? definition.annotations?.title ?? null,
        };
      }),
      sharedTools: Object.entries(sanitizedTools).map(([toolName, tool]) => ({
        description:
          typeof tool.description === "string" ? tool.description.trim() : null,
        name: toolName,
      })),
    });
  } finally {
    await linearMCPClient.close();
  }
}
