export const DEFAULT_PINNED_PROMPT_TITLE = "Untitled prompt";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePinnedPromptTitle(title: string | null | undefined) {
  return normalizeWhitespace(title ?? "") || DEFAULT_PINNED_PROMPT_TITLE;
}
