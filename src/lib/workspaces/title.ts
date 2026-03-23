export const DEFAULT_WORKSPACE_TITLE = "General";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeWorkspaceTitle(title: string | null | undefined) {
  return normalizeWhitespace(title ?? "") || DEFAULT_WORKSPACE_TITLE;
}
