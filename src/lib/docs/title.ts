export const DEFAULT_DOC_TITLE = "Untitled Doc";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripMarkdownExtension(value: string) {
  return value.replace(/\.md$/i, "");
}

export function normalizeDocTitle(title: string | null | undefined) {
  const normalizedTitle = normalizeWhitespace(stripMarkdownExtension(title ?? ""));
  return normalizedTitle || DEFAULT_DOC_TITLE;
}

export function buildDocFileName(title: string) {
  return `${normalizeDocTitle(title)}.md`;
}
