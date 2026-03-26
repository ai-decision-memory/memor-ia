"use client";

import {
  formatSourceCitationProvider,
  type SourceCitation,
} from "@/lib/citations";

export function SourceCitationList({
  citations,
  title = "Sources",
  variant = "compact",
}: {
  citations: SourceCitation[];
  title?: string;
  variant?: "compact" | "full";
}) {
  if (citations.length === 0) {
    return null;
  }

  if (variant === "full") {
    return (
      <div className="rounded-2xl border border-border-subtle bg-sidebar/50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
          {title}
        </p>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {citations.map((citation) => {
            const provider = formatSourceCitationProvider(citation.provider);

            return (
              <li
                key={citation.id}
                className="rounded-xl border border-border-subtle bg-page/70 p-3 text-sm text-text-secondary"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {provider}
                </p>
                {citation.url ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block font-medium text-text-primary transition hover:text-text-secondary"
                  >
                    {citation.label}
                  </a>
                ) : (
                  <p className="mt-2 font-medium text-text-primary">
                    {citation.label}
                  </p>
                )}
                {citation.preview ? (
                  <p className="mt-2 text-xs leading-5 text-text-secondary">
                    {citation.preview}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {citations.map((citation) => {
          const provider = formatSourceCitationProvider(citation.provider);
          const className =
            "rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-secondary transition hover:border-text-primary hover:text-text-primary";

          if (citation.url) {
            return (
              <a
                key={citation.id}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className={className}
              >
                {provider}: {citation.label}
              </a>
            );
          }

          return (
            <span key={citation.id} className={className}>
              {provider}: {citation.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
