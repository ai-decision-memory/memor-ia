import {
  GITHUB_MCP_CHAT_TOOL_NAMES,
  GITHUB_OWNER_SCOPED_TOOL_NAMES,
} from "@/lib/mcp/chat-tool-config";

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
    "properties" in jsonSchema &&
    typeof jsonSchema.properties === "object" &&
    jsonSchema.properties !== null
      ? { ...(jsonSchema.properties as Record<string, unknown>) }
      : undefined;

  if (properties) {
    for (const field of fieldsToRemove) {
      delete properties[field];
    }
  }

  const required = Array.isArray(jsonSchema.required)
    ? (jsonSchema.required as unknown[]).filter(
        (key) => typeof key === "string" && !fieldsToRemove.includes(key)
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

function injectOwnerIntoInput(input: unknown, owner: string) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { owner };
  }

  return {
    ...(input as Record<string, unknown>),
    owner,
  };
}

function wrapToolWithOwner(tool: ToolLike, owner: string): ToolLike {
  if (!tool?.execute) {
    return tool;
  }

  const originalExecute = tool.execute;

  return {
    ...tool,
    inputSchema: stripFieldsFromSchema(tool.inputSchema, ["owner"]),
    execute: (input: unknown, options: unknown) =>
      originalExecute(injectOwnerIntoInput(input, owner), options),
  };
}

export function sanitizeGitHubToolsForChat<T extends Record<string, ToolLike>>(
  tools: T,
  owner: string
) {
  const filteredTools = Object.fromEntries(
    Object.entries(tools).filter(([toolName]) =>
      (GITHUB_MCP_CHAT_TOOL_NAMES as readonly string[]).includes(toolName)
    )
  ) as Record<string, ToolLike>;

  for (const toolName of GITHUB_OWNER_SCOPED_TOOL_NAMES) {
    if (filteredTools[toolName]) {
      filteredTools[toolName] = wrapToolWithOwner(filteredTools[toolName], owner);
    }
  }

  return filteredTools as Pick<T, (typeof GITHUB_MCP_CHAT_TOOL_NAMES)[number]>;
}
