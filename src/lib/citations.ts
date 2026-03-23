import type { UIMessage } from "ai";

type MessagePartLike = {
  input?: unknown;
  output?: unknown;
  state?: unknown;
  toolCallId?: unknown;
  toolName?: unknown;
  type?: unknown;
};

type MessageLike = Pick<UIMessage, "id"> & {
  parts?: MessagePartLike[];
};

type CitationExtractionOptions = {
  githubOrgLogin?: string | null;
  limit?: number;
};

type CitationProvider = "github" | "linear";

type CitationContext = {
  githubOrgLogin?: string | null;
  input: unknown;
  output: unknown;
  provider: CitationProvider;
  toolName: string;
};

export type SourceCitation = {
  id: string;
  label: string;
  provider: CitationProvider;
  toolName: string;
  url: string | null;
};

const DEFAULT_COLLECTION_LIMIT = 12;
const DEFAULT_MESSAGE_LIMIT = 6;
const URL_FIELDS = ["htmlUrl", "html_url", "url", "webUrl", "web_url"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCitationProvider(value: unknown): value is CitationProvider {
  return value === "github" || value === "linear";
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableUrl(value: unknown) {
  const url = getStringValue(value);

  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    if (!/^https?:$/.test(parsedUrl.protocol)) {
      return null;
    }

    if (parsedUrl.hostname === "api.github.com") {
      return convertGitHubApiUrl(parsedUrl);
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function convertGitHubApiUrl(url: URL) {
  const issueMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)$/);

  if (issueMatch) {
    return `https://github.com/${issueMatch[1]}/${issueMatch[2]}/issues/${issueMatch[3]}`;
  }

  const commitMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/commits\/([^/]+)$/);

  if (commitMatch) {
    return `https://github.com/${commitMatch[1]}/${commitMatch[2]}/commit/${commitMatch[3]}`;
  }

  const branchMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/branches\/([^/]+)$/);

  if (branchMatch) {
    return encodeURI(
      `https://github.com/${branchMatch[1]}/${branchMatch[2]}/tree/${branchMatch[3]}`,
    );
  }

  const contentsMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)$/);

  if (contentsMatch) {
    const ref = url.searchParams.get("ref") ?? "HEAD";

    return encodeURI(
      `https://github.com/${contentsMatch[1]}/${contentsMatch[2]}/blob/${ref}/${contentsMatch[3]}`,
    );
  }

  const repositoryMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)$/);

  if (repositoryMatch) {
    return `https://github.com/${repositoryMatch[1]}/${repositoryMatch[2]}`;
  }

  const teamMatch = url.pathname.match(/^\/orgs\/([^/]+)\/teams\/([^/]+)$/);

  if (teamMatch) {
    return `https://github.com/orgs/${teamMatch[1]}/teams/${teamMatch[2]}`;
  }

  return null;
}

function getCitationProvider(toolName: string): CitationProvider | null {
  if (toolName.startsWith("github_")) {
    return "github";
  }

  if (toolName.startsWith("linear_")) {
    return "linear";
  }

  return null;
}

function formatToolSubject(toolName: string) {
  const normalized = toolName.replace(/^(github|linear)_/, "");
  const parts = normalized.split("_");

  if (parts.length <= 1) {
    return normalized.replace(/_/g, " ");
  }

  return parts.slice(1).join(" ").replace(/_/g, " ");
}

function getGitHubOwner(record: Record<string, unknown>, context: CitationContext) {
  return (
    getStringValue(record.organizationLogin) ||
    getStringValue(record.owner) ||
    getStringValue(record.organization) ||
    (isRecord(context.input) ? getStringValue(context.input.owner) : "") ||
    context.githubOrgLogin ||
    ""
  );
}

function getGitHubRepository(record: Record<string, unknown>, context: CitationContext) {
  const fullName = getStringValue(record.fullName) || getStringValue(record.full_name);

  if (fullName.includes("/")) {
    return fullName.split("/").slice(-1)[0] ?? "";
  }

  return (
    getStringValue(record.repository) ||
    getStringValue(record.repo) ||
    getStringValue(record.name) ||
    (isRecord(context.input) ? getStringValue(context.input.repo) : "") ||
    ""
  );
}

function getGitHubFallbackUrl(record: Record<string, unknown>, context: CitationContext) {
  const owner = getGitHubOwner(record, context);
  const repository = getGitHubRepository(record, context);
  const path = getStringValue(record.path);
  const ref =
    getStringValue(record.ref) ||
    getStringValue(record.defaultBranch) ||
    getStringValue(record.default_branch) ||
    "HEAD";
  const sha = getStringValue(record.sha);
  const slug = getStringValue(record.slug);

  if (owner && slug && /team/i.test(context.toolName)) {
    return `https://github.com/orgs/${owner}/teams/${slug}`;
  }

  if (owner && repository) {
    if (path) {
      return encodeURI(
        `https://github.com/${owner}/${repository}/blob/${ref}/${path}`,
      );
    }

    if (sha) {
      return `https://github.com/${owner}/${repository}/commit/${sha}`;
    }

    if (/branch/i.test(context.toolName) && getStringValue(record.ref)) {
      return encodeURI(
        `https://github.com/${owner}/${repository}/tree/${getStringValue(record.ref)}`,
      );
    }

    if (/deploy/i.test(context.toolName)) {
      return `https://github.com/${owner}/${repository}/deployments`;
    }

    return `https://github.com/${owner}/${repository}`;
  }

  if (owner && /organization|org|team/i.test(context.toolName)) {
    return `https://github.com/${owner}`;
  }

  return null;
}

function getFallbackUrl(record: Record<string, unknown>, context: CitationContext) {
  if (context.provider === "github") {
    return getGitHubFallbackUrl(record, context);
  }

  return null;
}

function getCitationLabel(record: Record<string, unknown>, context: CitationContext) {
  const identifier = getStringValue(record.identifier);
  const title = getStringValue(record.title);
  const fullName = getStringValue(record.fullName) || getStringValue(record.full_name);
  const organizationLogin =
    getStringValue(record.organizationLogin) ||
    getStringValue(record.organization) ||
    context.githubOrgLogin ||
    "";
  const name = getStringValue(record.name);
  const login = getStringValue(record.login);
  const slug = getStringValue(record.slug);
  const path = getStringValue(record.path);
  const repository = getStringValue(record.repository) || getStringValue(record.repo);
  const sha = getStringValue(record.sha);
  const ref = getStringValue(record.ref);
  const repositoryLabel =
    fullName || (organizationLogin && repository ? `${organizationLogin}/${repository}` : repository);

  if (identifier && title) {
    return `${identifier} - ${title}`;
  }

  if (repositoryLabel && path) {
    return `${repositoryLabel}/${path}`;
  }

  if (repositoryLabel) {
    return repositoryLabel;
  }

  if (title) {
    return title;
  }

  if (name && path) {
    return `${name}/${path}`;
  }

  if (name) {
    return name;
  }

  if (login) {
    return login;
  }

  if (slug) {
    return slug;
  }

  if (sha) {
    return `Commit ${sha.slice(0, 7)}`;
  }

  if (ref) {
    return `Branch ${ref}`;
  }

  if (path) {
    return path;
  }

  if (typeof record.number === "number") {
    return `${formatToolSubject(context.toolName)} #${record.number}`;
  }

  if (typeof record.id === "number" || typeof record.id === "string") {
    return `${formatToolSubject(context.toolName)} ${record.id}`;
  }

  return "";
}

function looksLikeCitationRecord(record: Record<string, unknown>) {
  return (
    URL_FIELDS.some((field) => getNullableUrl(record[field])) ||
    typeof record.number === "number" ||
    typeof record.id === "number" ||
    typeof record.id === "string" ||
    Boolean(
      getStringValue(record.identifier) ||
        getStringValue(record.title) ||
        getStringValue(record.fullName) ||
        getStringValue(record.full_name) ||
        getStringValue(record.name) ||
        getStringValue(record.login) ||
        getStringValue(record.slug) ||
        getStringValue(record.path) ||
        getStringValue(record.sha) ||
        getStringValue(record.ref),
    )
  );
}

function collectCitationRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 4 || value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectCitationRecords(item, depth + 1));
  }

  if (!isRecord(value)) {
    return [];
  }

  const records: Record<string, unknown>[] = [];

  if (looksLikeCitationRecord(value)) {
    records.push(value);
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
      records.push(...collectCitationRecords(nestedValue, depth + 1));
    }
  }

  return records;
}

function buildCitationId(citation: Omit<SourceCitation, "id">) {
  const base = [citation.provider, citation.toolName, citation.url ?? citation.label]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "source";
}

function normalizeCitationRecord(
  record: Record<string, unknown>,
  context: CitationContext,
): SourceCitation | null {
  const directUrl = URL_FIELDS
    .map((field) => getNullableUrl(record[field]))
    .find((value): value is string => Boolean(value));
  const fallbackUrl = directUrl ? null : getFallbackUrl(record, context);
  const url = directUrl ?? fallbackUrl;
  const label = getCitationLabel(record, context);

  if (!label && !url) {
    return null;
  }

  const citation = {
    label: label || "View source",
    provider: context.provider,
    toolName: context.toolName,
    url,
  } satisfies Omit<SourceCitation, "id">;

  return {
    ...citation,
    id: buildCitationId(citation),
  };
}

function buildFallbackCitation(context: CitationContext): SourceCitation | null {
  const fallbackRecord = {
    ...(isRecord(context.output) ? context.output : {}),
    ...(isRecord(context.input) ? context.input : {}),
    organizationLogin:
      (isRecord(context.output) ? context.output.organizationLogin : undefined) ??
      (isRecord(context.input) ? context.input.organizationLogin : undefined) ??
      context.githubOrgLogin ??
      undefined,
  };

  const fallbackCitation = normalizeCitationRecord(fallbackRecord, context);

  if (fallbackCitation) {
    return fallbackCitation;
  }

  return null;
}

function dedupeCitations(citations: SourceCitation[], limit: number) {
  const uniqueCitations = new Map<string, SourceCitation>();

  for (const citation of citations) {
    const key = citation.url ?? `${citation.provider}:${citation.label.toLowerCase()}`;

    if (!uniqueCitations.has(key)) {
      uniqueCitations.set(key, citation);
    }

    if (uniqueCitations.size >= limit) {
      break;
    }
  }

  return [...uniqueCitations.values()];
}

function extractCitationsFromToolPart(
  part: MessagePartLike,
  { githubOrgLogin }: CitationExtractionOptions,
) {
  if (part.type !== "dynamic-tool" || part.state !== "output-available") {
    return [] as SourceCitation[];
  }

  const toolName = typeof part.toolName === "string" ? part.toolName : "";
  const provider = getCitationProvider(toolName);

  if (!provider) {
    return [];
  }

  const context: CitationContext = {
    githubOrgLogin,
    input: part.input,
    output: part.output,
    provider,
    toolName,
  };
  const citations = collectCitationRecords(part.output)
    .map((record) => normalizeCitationRecord(record, context))
    .filter((citation): citation is SourceCitation => Boolean(citation));

  if (citations.length > 0) {
    return citations;
  }

  const fallbackCitation = buildFallbackCitation(context);

  return fallbackCitation ? [fallbackCitation] : [];
}

export function normalizeSourceCitations(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as SourceCitation[];
  }

  return value
    .map((item) => {
      if (!isRecord(item) || !isCitationProvider(item.provider)) {
        return null;
      }

      const label = getStringValue(item.label);
      const toolName = getStringValue(item.toolName);

      if (!label || !toolName) {
        return null;
      }

      const citation = {
        label,
        provider: item.provider,
        toolName,
        url: getNullableUrl(item.url),
      } satisfies Omit<SourceCitation, "id">;

      return {
        ...citation,
        id:
          getStringValue(item.id) ||
          buildCitationId(citation),
      };
    })
    .filter((citation): citation is SourceCitation => Boolean(citation));
}

export function extractSourceCitationsFromMessage(
  message: MessageLike,
  options: CitationExtractionOptions = {},
) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const citations = parts.flatMap((part) => extractCitationsFromToolPart(part, options));

  return dedupeCitations(citations, options.limit ?? DEFAULT_MESSAGE_LIMIT);
}

export function extractSourceCitationsFromMessages(
  messages: MessageLike[],
  options: CitationExtractionOptions = {},
) {
  const citations = messages.flatMap((message) =>
    extractSourceCitationsFromMessage(message, {
      ...options,
      limit: options.limit ?? DEFAULT_COLLECTION_LIMIT,
    }),
  );

  return dedupeCitations(citations, options.limit ?? DEFAULT_COLLECTION_LIMIT);
}

export function formatSourceCitationProvider(provider: CitationProvider) {
  return provider === "github" ? "GitHub" : "Linear";
}

function escapeMarkdownLabel(label: string) {
  return label.replace(/[\[\]]/g, "\\$&");
}

export function buildSourceCitationsMarkdown(citations: SourceCitation[]) {
  const normalizedCitations = normalizeSourceCitations(citations);

  if (normalizedCitations.length === 0) {
    return "";
  }

  return [
    "## Sources",
    "",
    ...normalizedCitations.map((citation) =>
      citation.url
        ? `- ${formatSourceCitationProvider(citation.provider)}: [${escapeMarkdownLabel(citation.label)}](${citation.url})`
        : `- ${formatSourceCitationProvider(citation.provider)}: ${citation.label}`,
    ),
  ].join("\n");
}
