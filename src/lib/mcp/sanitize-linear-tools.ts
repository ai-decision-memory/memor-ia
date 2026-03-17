import {
  LINEAR_ALLOWED_ACTION_PATTERNS,
  LINEAR_ALLOWED_SUBJECT_PATTERNS,
  LINEAR_BLOCKED_PATTERNS,
  LINEAR_MEMBER_USER_PATTERNS,
} from "@/lib/mcp/chat-tool-config";

type ToolLike = {
  description?: string;
  execute?: (input: unknown, options: unknown) => PromiseLike<unknown>;
  inputSchema?: unknown;
} & Record<string, unknown>;

type LinearTeamScope = {
  teamId: string;
  teamKey: string;
  teamName: string;
};

export type LinearToolInspection = {
  allowed: boolean;
  blockedPatterns: string[];
  description: string | null;
  exposedToolName: string | null;
  isMemberTool: boolean;
  matchedActions: string[];
  matchedSubjects: string[];
  scopedFieldValues: Partial<Record<keyof typeof LINEAR_TEAM_FIELD_VALUES, string>>;
  scopedFields: Array<keyof typeof LINEAR_TEAM_FIELD_VALUES>;
  toolName: string;
};

const LINEAR_TEAM_FIELD_VALUES = {
  team: (scope: LinearTeamScope) => scope.teamKey,
  teamId: (scope: LinearTeamScope) => scope.teamId,
  teamKey: (scope: LinearTeamScope) => scope.teamKey,
  teamName: (scope: LinearTeamScope) => scope.teamName,
} as const;

function getJsonSchema(inputSchema: unknown) {
  if (!inputSchema || typeof inputSchema !== "object") {
    return null;
  }

  const schemaContainer = inputSchema as { jsonSchema?: Record<string, unknown> };
  const jsonSchema = schemaContainer.jsonSchema;

  if (!jsonSchema || typeof jsonSchema !== "object") {
    return null;
  }

  return jsonSchema;
}

function getScopedFieldNames(inputSchema: unknown) {
  const jsonSchema = getJsonSchema(inputSchema);

  if (!jsonSchema) {
    return [] as Array<keyof typeof LINEAR_TEAM_FIELD_VALUES>;
  }

  const properties =
    "properties" in jsonSchema &&
    typeof jsonSchema.properties === "object" &&
    jsonSchema.properties !== null
      ? (jsonSchema.properties as Record<string, unknown>)
      : {};

  return (Object.keys(LINEAR_TEAM_FIELD_VALUES) as Array<
    keyof typeof LINEAR_TEAM_FIELD_VALUES
  >).filter((fieldName) => fieldName in properties);
}

function stripFieldsFromSchema(inputSchema: unknown, fieldsToRemove: string[]) {
  const jsonSchema = getJsonSchema(inputSchema);

  if (!jsonSchema) {
    return inputSchema;
  }

  const schemaContainer = inputSchema as Record<string, unknown>;

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
    ...schemaContainer,
    jsonSchema: {
      ...jsonSchema,
      ...(properties ? { properties } : {}),
      ...(required ? { required } : {}),
    },
  };
}

function injectScopedFieldsIntoInput({
  input,
  scope,
  scopedFields,
}: {
  input: unknown;
  scope: LinearTeamScope;
  scopedFields: Array<keyof typeof LINEAR_TEAM_FIELD_VALUES>;
}) {
  const baseInput =
    input && typeof input === "object" && !Array.isArray(input)
      ? { ...(input as Record<string, unknown>) }
      : {};

  for (const fieldName of scopedFields) {
    baseInput[fieldName] = LINEAR_TEAM_FIELD_VALUES[fieldName](scope);
  }

  return baseInput;
}

function wrapToolWithLinearTeamScope(
  tool: ToolLike,
  scope: LinearTeamScope
): ToolLike {
  if (!tool.execute) {
    return tool;
  }

  const scopedFields = getScopedFieldNames(tool.inputSchema);

  if (scopedFields.length === 0) {
    return tool;
  }

  const originalExecute = tool.execute;

  return {
    ...tool,
    inputSchema: stripFieldsFromSchema(tool.inputSchema, scopedFields),
    execute: (input: unknown, options: unknown) =>
      originalExecute(
        injectScopedFieldsIntoInput({
          input,
          scope,
          scopedFields,
        }),
        options
      ),
  };
}

function wrapToolWithLinearErrorBoundary(toolName: string, tool: ToolLike): ToolLike {
  if (!tool.execute) {
    return tool;
  }

  const originalExecute = tool.execute;

  return {
    ...tool,
    execute: async (input: unknown, options: unknown) => {
      try {
        return await originalExecute(input, options);
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Linear MCP request failed",
          toolName,
          unavailable: true,
        };
      }
    },
  };
}

function decorateLinearTool(tool: ToolLike): ToolLike {
  const description = tool.description?.trim();

  return {
    ...tool,
    description: description ? `Linear team tool. ${description}` : "Linear team tool.",
  };
}

function matchesAnyPattern(value: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function getMatchingPatterns(value: string, patterns: readonly RegExp[]) {
  return patterns
    .filter((pattern) => pattern.test(value))
    .map((pattern) => pattern.toString());
}

function isLinearMemberTool(searchText: string) {
  return (
    matchesAnyPattern(searchText, LINEAR_MEMBER_USER_PATTERNS) &&
    /\bteam\b/i.test(searchText)
  );
}

function isAllowedLinearTool(toolName: string, tool: ToolLike) {
  const searchText = [toolName, tool.description ?? ""].join(" ");

  if (matchesAnyPattern(searchText, LINEAR_BLOCKED_PATTERNS)) {
    return false;
  }

  if (isLinearMemberTool(searchText)) {
    return matchesAnyPattern(searchText, LINEAR_ALLOWED_ACTION_PATTERNS);
  }

  return (
    matchesAnyPattern(searchText, LINEAR_ALLOWED_ACTION_PATTERNS) &&
    matchesAnyPattern(searchText, LINEAR_ALLOWED_SUBJECT_PATTERNS)
  );
}

export function inspectLinearTool(
  toolName: string,
  tool: ToolLike,
  scope: LinearTeamScope
): LinearToolInspection {
  const searchText = [toolName, tool.description ?? ""].join(" ");
  const blockedPatterns = getMatchingPatterns(searchText, LINEAR_BLOCKED_PATTERNS);
  const matchedActions = getMatchingPatterns(
    searchText,
    LINEAR_ALLOWED_ACTION_PATTERNS
  );
  const matchedSubjects = getMatchingPatterns(
    searchText,
    LINEAR_ALLOWED_SUBJECT_PATTERNS
  );
  const isMemberTool = isLinearMemberTool(searchText);
  const scopedFields = getScopedFieldNames(tool.inputSchema);

  return {
    allowed:
      blockedPatterns.length === 0 &&
      (isMemberTool
        ? matchedActions.length > 0
        : matchedActions.length > 0 && matchedSubjects.length > 0),
    blockedPatterns,
    description: tool.description?.trim() ?? null,
    exposedToolName:
      blockedPatterns.length === 0 &&
      (isMemberTool
        ? matchedActions.length > 0
        : matchedActions.length > 0 && matchedSubjects.length > 0)
        ? `linear_${toolName}`
        : null,
    isMemberTool,
    matchedActions,
    matchedSubjects,
    scopedFieldValues: Object.fromEntries(
      scopedFields.map((fieldName) => [
        fieldName,
        LINEAR_TEAM_FIELD_VALUES[fieldName](scope),
      ])
    ) as Partial<Record<keyof typeof LINEAR_TEAM_FIELD_VALUES, string>>,
    scopedFields,
    toolName,
  };
}

export function inspectLinearToolsForChat<T extends Record<string, ToolLike>>(
  tools: T,
  scope: LinearTeamScope
) {
  return Object.entries(tools).map(([toolName, tool]) =>
    inspectLinearTool(toolName, tool, scope)
  );
}

export function sanitizeLinearToolsForChat<T extends Record<string, ToolLike>>(
  tools: T,
  scope: LinearTeamScope
) {
  const sanitized = Object.fromEntries(
    Object.entries(tools).filter(([toolName, tool]) =>
      isAllowedLinearTool(toolName, tool)
    )
  ) as Record<string, ToolLike>;

  for (const [toolName, tool] of Object.entries(sanitized)) {
    sanitized[toolName] = wrapToolWithLinearErrorBoundary(
      toolName,
      wrapToolWithLinearTeamScope(tool, scope)
    );
  }

  return Object.fromEntries(
    Object.entries(sanitized).map(([toolName, tool]) => [
      `linear_${toolName}`,
      decorateLinearTool(tool),
    ])
  ) as Record<string, ToolLike>;
}
