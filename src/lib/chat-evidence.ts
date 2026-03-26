import {
  extractSourceCitationsFromToolPart,
  type SourceCitation,
} from "@/lib/citations";
import type { ChatMessageMetadata, ChatUIMessage } from "@/lib/chat-messages";

type EvidenceOptions = {
  githubOrgLogin?: string | null;
};

type MessagePartLike = {
  errorText?: unknown;
  input?: unknown;
  output?: unknown;
  state?: unknown;
  toolCallId?: unknown;
  toolName?: unknown;
  type?: unknown;
};

export type ToolTraceEntry = {
  citations: SourceCitation[];
  id: string;
  inputSummary: string | null;
  label: string;
  outputPreview: string | null;
  provider: string | null;
  state: "error" | "pending" | "success";
  toolName: string;
};

export type WhyThisAnswerSummary = {
  badges: string[];
  details: string[];
  summary: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateInlineValue(value: string, maxLength = 80) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function summarizeRecordPreview(record: Record<string, unknown>) {
  for (const key of [
    "message",
    "summary",
    "description",
    "body",
    "title",
    "name",
    "identifier",
    "status",
    "state",
    "path",
  ]) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return truncateInlineValue(value.trim().replace(/\s+/g, " "), 160);
    }
  }

  const sha = record.sha;

  if (typeof sha === "string" && sha.trim()) {
    return `Commit ${sha.trim().slice(0, 7)}`;
  }

  return null;
}

function summarizeOutputValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return truncateInlineValue(value.trim().replace(/\s+/g, " "), 160);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "No matching records returned.";
    }

    const firstPreview = summarizeOutputValue(value[0]);

    if (firstPreview) {
      return `${pluralize(value.length, "record")} returned. Example: ${firstPreview}`;
    }

    return `${pluralize(value.length, "record")} returned.`;
  }

  if (isRecord(value)) {
    return summarizeRecordPreview(value);
  }

  return null;
}

function getToolQualifier(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;

  for (const key of [
    "query",
    "q",
    "question",
    "prompt",
    "repo",
    "repository",
    "project",
    "team",
    "identifier",
    "title",
  ]) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return truncateInlineValue(record[key].trim());
    }
  }

  return null;
}

export function getToolProviderLabel(toolName: string) {
  if (toolName.startsWith("linear_")) {
    return "Linear";
  }

  if (toolName.startsWith("github_")) {
    return "GitHub";
  }

  return null;
}

function splitToolName(toolName: string) {
  const provider = getToolProviderLabel(toolName);
  const normalizedName = provider ? toolName.slice(provider.length + 1) : toolName;
  const [action = "use", ...subjectParts] = normalizedName.split("_");

  return {
    action,
    provider,
    subjectParts,
  };
}

export function humanizeToolName(toolName: string) {
  const { provider, subjectParts } = splitToolName(toolName);
  const formattedProvider = provider ? `${provider} ` : "";
  const subject = subjectParts
    .map((part) => {
      if (part === "org") {
        return "organization";
      }

      if (part === "repo") {
        return "repository";
      }

      return part;
    })
    .join(" ")
    .trim();

  return `${formattedProvider}${subject || "tool"}`.trim();
}

function getActionLabels(action: string) {
  switch (action) {
    case "search":
      return { continuous: "Searching", infinitive: "search", past: "Searched" };
    case "list":
      return { continuous: "Listing", infinitive: "list", past: "Listed" };
    case "get":
      return { continuous: "Getting", infinitive: "get", past: "Got" };
    case "read":
      return { continuous: "Reading", infinitive: "read", past: "Read" };
    case "find":
      return { continuous: "Finding", infinitive: "find", past: "Found" };
    case "query":
      return { continuous: "Querying", infinitive: "query", past: "Queried" };
    case "create":
      return { continuous: "Creating", infinitive: "create", past: "Created" };
    case "update":
      return { continuous: "Updating", infinitive: "update", past: "Updated" };
    default:
      return { continuous: "Using", infinitive: "use", past: "Used" };
  }
}

export function buildToolActivityLabel(part: MessagePartLike) {
  const toolName = typeof part.toolName === "string" ? part.toolName : "unknown";
  const state = typeof part.state === "string" ? part.state : "unknown";
  const qualifier = getToolQualifier(part.input);
  const { action } = splitToolName(toolName);
  const labels = getActionLabels(action);
  const subject = humanizeToolName(toolName);
  const suffix = qualifier ? ` for ${qualifier}` : "";

  if (state === "output-error") {
    return `Failed to ${labels.infinitive} ${subject}${suffix}`;
  }

  if (state === "output-available") {
    return `${labels.past} ${subject}${suffix}`;
  }

  return `${labels.continuous} ${subject}${suffix}`;
}

export function isCompletedToolState(state: string) {
  return state === "output-available" || state === "output-error";
}

function isToolPart(part: MessagePartLike) {
  return (
    part.type === "dynamic-tool" ||
    (typeof part.type === "string" && part.type.startsWith("tool-"))
  );
}

function normalizeTraceState(state: string): ToolTraceEntry["state"] {
  if (state === "output-available") {
    return "success";
  }

  if (state === "output-error") {
    return "error";
  }

  return "pending";
}

function buildToolOutputPreview(
  part: MessagePartLike,
  citations: SourceCitation[],
) {
  if (typeof part.errorText === "string" && part.errorText.trim()) {
    return truncateInlineValue(part.errorText.trim().replace(/\s+/g, " "), 180);
  }

  const citationPreview = citations.find((citation) => citation.preview)?.preview;

  if (citationPreview) {
    return citationPreview;
  }

  return summarizeOutputValue(part.output);
}

function getDurationLabel(metadata: ChatMessageMetadata | undefined) {
  if (
    typeof metadata?.createdAt !== "number" ||
    typeof metadata.completedAt !== "number"
  ) {
    return null;
  }

  const durationMs = metadata.completedAt - metadata.createdAt;

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  if (durationMs < 10_000) {
    return `${(durationMs / 1000).toFixed(1)} s`;
  }

  if (durationMs < 60_000) {
    return `${Math.round(durationMs / 1000)} s`;
  }

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1000);

  return `${minutes}m ${seconds}s`;
}

export function extractToolTraceFromMessage(
  message: Pick<ChatUIMessage, "id" | "parts">,
  options: EvidenceOptions = {},
) {
  return message.parts
    .filter((part) => isToolPart(part as MessagePartLike))
    .map((part, index) => {
      const toolPart = part as MessagePartLike;
      const toolName =
        typeof toolPart.toolName === "string" ? toolPart.toolName : "unknown";
      const state =
        typeof toolPart.state === "string" ? toolPart.state : "unknown";
      const citations = extractSourceCitationsFromToolPart(toolPart, options);

      return {
        citations,
        id:
          typeof toolPart.toolCallId === "string"
            ? toolPart.toolCallId
            : `${message.id}-${toolName}-${index}`,
        inputSummary: getToolQualifier(toolPart.input),
        label: buildToolActivityLabel(toolPart),
        outputPreview: buildToolOutputPreview(toolPart, citations),
        provider: getToolProviderLabel(toolName),
        state: normalizeTraceState(state),
        toolName,
      } satisfies ToolTraceEntry;
    });
}

export function buildWhyThisAnswerSummary({
  citations,
  metadata,
  toolTrace,
}: {
  citations: SourceCitation[];
  metadata?: ChatMessageMetadata;
  toolTrace: ToolTraceEntry[];
}) {
  const providers = [...new Set(
    toolTrace
      .map((entry) => entry.provider)
      .filter((provider): provider is string => Boolean(provider)),
  )];
  const toolCallCount = toolTrace.length;
  const citationCount = citations.length;
  const errorCount = toolTrace.filter((entry) => entry.state === "error").length;
  const pendingCount = toolTrace.filter((entry) => entry.state === "pending").length;
  const details: string[] = [];
  const badges = [
    toolCallCount > 0 ? pluralize(toolCallCount, "tool call") : "Chat context only",
    citationCount > 0 ? pluralize(citationCount, "source") : null,
    providers.length > 0 ? providers.join(" + ") : null,
    metadata?.model ? metadata.model : null,
    typeof metadata?.totalTokens === "number"
      ? pluralize(metadata.totalTokens, "token")
      : null,
  ].filter((value): value is string => Boolean(value));

  if (metadata?.model) {
    details.push(`Model: ${metadata.model}`);
  }

  const durationLabel = getDurationLabel(metadata);

  if (durationLabel) {
    details.push(`Latency: ${durationLabel}`);
  }

  if (typeof metadata?.inputTokens === "number" || typeof metadata?.outputTokens === "number") {
    const tokenBreakdown = [
      typeof metadata.inputTokens === "number"
        ? `${metadata.inputTokens} input`
        : null,
      typeof metadata.outputTokens === "number"
        ? `${metadata.outputTokens} output`
        : null,
      typeof metadata.reasoningTokens === "number"
        ? `${metadata.reasoningTokens} reasoning`
        : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" · ");

    if (tokenBreakdown) {
      details.push(`Usage: ${tokenBreakdown}`);
    }
  }

  if (metadata?.finishReason && metadata.finishReason !== "stop") {
    details.push(`Finish reason: ${metadata.finishReason}`);
  }

  let summary: string;

  if (toolCallCount === 0) {
    summary =
      "This answer was generated from the current chat context. No GitHub or Linear tools were needed.";
  } else if (pendingCount > 0) {
    const providerLabel =
      providers.length > 0 ? formatList(providers) : "connected tools";
    summary = `This answer is still gathering evidence from ${providerLabel}. ${pluralize(
      pendingCount,
      "tool call",
    )} ${pendingCount === 1 ? "is" : "are"} still in progress.`;
  } else if (errorCount > 0) {
    const providerLabel =
      providers.length > 0 ? formatList(providers) : "connected tools";
    summary = `This answer is grounded in ${pluralize(
      toolCallCount,
      "tool call",
    )} across ${providerLabel}, but ${pluralize(
      errorCount,
      "tool call",
    )} failed. Some supporting context may be missing.`;
  } else {
    const providerLabel =
      providers.length > 0 ? formatList(providers) : "connected tools";
    summary = `This answer is grounded in ${pluralize(
      toolCallCount,
      "tool call",
    )} across ${providerLabel}${citationCount > 0 ? ` and ${pluralize(citationCount, "source")}` : ""}.`;
  }

  return {
    badges,
    details,
    summary,
  } satisfies WhyThisAnswerSummary;
}
