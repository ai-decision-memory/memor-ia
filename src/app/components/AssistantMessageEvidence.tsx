"use client";

import {
  buildWhyThisAnswerSummary,
  extractToolTraceFromMessage,
  humanizeToolName,
} from "@/lib/chat-evidence";
import type { ChatUIMessage } from "@/lib/chat-messages";
import {
  extractSourceCitationsFromMessage,
  formatSourceCitationProvider,
} from "@/lib/citations";
import type { ReactNode } from "react";
import { TextShimmer } from "./TextShimmer";

function EvidencePanel({
  children,
  defaultOpen = false,
  summary,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  summary?: string;
  title: string;
}) {
  return (
    <details
      className="overflow-hidden rounded-2xl border border-border-subtle bg-sidebar/35"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {title}
          </p>
          {summary ? (
            <p className="mt-1 text-xs text-text-muted">{summary}</p>
          ) : null}
        </div>
        <span className="text-xs text-text-muted">Expand</span>
      </summary>
      <div className="border-t border-border-subtle px-4 py-4">{children}</div>
    </details>
  );
}

function TraceStateBadge({ state }: { state: "error" | "pending" | "success" }) {
  const className =
    state === "success"
      ? "border-emerald-500/40 text-emerald-300"
      : state === "error"
        ? "border-red-500/40 text-red-300"
        : "border-border-strong text-text-muted";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${className}`}>
      {state}
    </span>
  );
}

export function AssistantMessageEvidence({
  githubOrgLogin,
  message,
}: {
  githubOrgLogin?: string | null;
  message: ChatUIMessage;
}) {
  const citations = extractSourceCitationsFromMessage(message, {
    githubOrgLogin,
  });
  const toolTrace = extractToolTraceFromMessage(message, {
    githubOrgLogin,
  });
  const whyThisAnswer = buildWhyThisAnswerSummary({
    citations,
    metadata: message.metadata,
    toolTrace,
  });
  const hasPendingTrace = toolTrace.some((entry) => entry.state === "pending");
  const hasEvidence =
    citations.length > 0 ||
    toolTrace.length > 0 ||
    whyThisAnswer.badges.length > 0 ||
    whyThisAnswer.details.length > 0;

  if (!hasEvidence) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <EvidencePanel defaultOpen title="Why This Answer">
        <p className="text-sm text-text-secondary">{whyThisAnswer.summary}</p>
        {whyThisAnswer.badges.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {whyThisAnswer.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border-strong px-2.5 py-1 text-[11px] text-text-secondary"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
        {whyThisAnswer.details.length > 0 ? (
          <div className="mt-3 space-y-1 text-xs text-text-muted">
            {whyThisAnswer.details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        ) : null}
      </EvidencePanel>

      {citations.length > 0 ? (
        <EvidencePanel
          defaultOpen={hasPendingTrace}
          summary={`${citations.length} supporting source${citations.length === 1 ? "" : "s"}`}
          title="Source Previews"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {citations.map((citation) => (
              <div
                key={citation.id}
                className="rounded-xl border border-border-subtle bg-page/70 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {formatSourceCitationProvider(citation.provider)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {humanizeToolName(citation.toolName)}
                  </p>
                </div>
                <p className="mt-2 text-sm font-medium text-text-primary">
                  {citation.label}
                </p>
                {citation.preview ? (
                  <p className="mt-2 text-xs leading-5 text-text-secondary">
                    {citation.preview}
                  </p>
                ) : null}
                {citation.url ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-xs text-text-secondary transition hover:text-text-primary"
                  >
                    Open source
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </EvidencePanel>
      ) : null}

      {toolTrace.length > 0 ? (
        <EvidencePanel
          defaultOpen={hasPendingTrace}
          summary={`${toolTrace.length} tool call${toolTrace.length === 1 ? "" : "s"}`}
          title="Tool Trace"
        >
          <div className="space-y-3">
            {toolTrace.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-border-subtle bg-page/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {entry.state === "pending" ? (
                      <TextShimmer className="block text-sm">
                        {entry.label}
                      </TextShimmer>
                    ) : (
                      <p className="text-sm text-text-primary">{entry.label}</p>
                    )}
                    {entry.inputSummary ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Input: {entry.inputSummary}
                      </p>
                    ) : null}
                  </div>
                  <TraceStateBadge state={entry.state} />
                </div>
                {entry.outputPreview ? (
                  <p className="mt-3 text-xs leading-5 text-text-secondary">
                    {entry.outputPreview}
                  </p>
                ) : null}
                {entry.citations.length > 0 ? (
                  <p className="mt-3 text-[11px] text-text-muted">
                    {entry.citations.length} source
                    {entry.citations.length === 1 ? "" : "s"} extracted
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </EvidencePanel>
      ) : null}
    </div>
  );
}
