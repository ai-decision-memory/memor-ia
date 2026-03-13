import { SLACK_MCP_CHAT_TOOL_NAMES } from "@/lib/mcp/chat-tool-config";

type ToolLike = {
  execute?: (input: unknown, options: unknown) => PromiseLike<unknown>;
  inputSchema?: unknown;
} & Record<string, unknown>;

function stripFieldsFromSchema(inputSchema: unknown, fieldsToRemove: string[]) {
  if (!inputSchema || typeof inputSchema !== "object") {
    return inputSchema;
  }

  const schemaContainer = inputSchema as { jsonSchema?: Record<string, unknown> };
  const jsonSchema = schemaContainer.jsonSchema;
  if (!jsonSchema || typeof jsonSchema !== "object") {
    return inputSchema;
  }

  const properties =
    "properties" in jsonSchema && typeof jsonSchema.properties === "object" && jsonSchema.properties !== null
      ? { ...(jsonSchema.properties as Record<string, unknown>) }
      : undefined;

  if (properties) {
    for (const field of fieldsToRemove) {
      delete properties[field];
    }
  }

  const required = Array.isArray(jsonSchema.required)
    ? (jsonSchema.required as unknown[]).filter(
        (key) => typeof key === "string" && !fieldsToRemove.includes(key),
      )
    : jsonSchema.required;

  return {
    ...inputSchema,
    jsonSchema: {
      ...jsonSchema,
      ...(properties ? { properties } : {}),
      ...(required ? { required } : {}),
    },
  };
}

function stripFieldsFromInput(input: unknown, fieldsToRemove: string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const result = { ...(input as Record<string, unknown>) };
  for (const field of fieldsToRemove) {
    delete result[field];
  }

  return result;
}

function wrapToolWithInputSanitization(tool: ToolLike, fieldsToRemove: string[]): ToolLike {
  if (!tool?.execute) {
    return tool;
  }

  const originalExecute = tool.execute;

  return {
    ...tool,
    inputSchema: stripFieldsFromSchema(tool.inputSchema, fieldsToRemove),
    execute: (input: unknown, options: unknown) => {
      return originalExecute(stripFieldsFromInput(input, fieldsToRemove), options);
    },
  };
}

/**
 * Slack MCP bug note:
 * Some tools were repeatedly called by the model with empty optional fields
 * like `cursor: ""` (and for read calls also `latest: ""` / `oldest: ""`).
 *
 * Affected tool groups in this app:
 * - all `slack_search_*` tools (e.g. slack_search_users, slack_search_channels)
 * - `slack_read_channel`
 * - `slack_read_thread`
 *
 * Fix strategy:
 * 1) Remove those fields from the exposed tool input schema so the model is less
 *    likely to generate them.
 * 2) Sanitize execution input server-side before calling the underlying MCP tool,
 *    guaranteeing those fields are dropped even if the model still sends them.
 */
export function sanitizeSlackToolsForChat<T extends Record<string, ToolLike>>(tools: T): T {
  const sanitized = Object.fromEntries(
    Object.entries(tools).filter(([toolName]) =>
      (SLACK_MCP_CHAT_TOOL_NAMES as readonly string[]).includes(toolName)
    )
  ) as Record<string, ToolLike>;

  for (const [toolName, tool] of Object.entries(sanitized)) {
    if (toolName.startsWith("slack_search_")) {
      sanitized[toolName] = wrapToolWithInputSanitization(tool, ["cursor"]);
      continue;
    }

    if (toolName === "slack_read_channel" || toolName === "slack_read_thread") {
      sanitized[toolName] = wrapToolWithInputSanitization(tool, ["cursor", "latest", "oldest"]);
    }
  }

  return sanitized as T;
}
