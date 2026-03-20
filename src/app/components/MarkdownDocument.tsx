"use client";

import type { ReactNode } from "react";

type ParagraphBlock = {
  lines: string[];
  type: "paragraph";
};

type HeadingBlock = {
  level: number;
  text: string;
  type: "heading";
};

type ListBlock = {
  items: string[];
  ordered: boolean;
  type: "list";
};

type BlockquoteBlock = {
  lines: string[];
  type: "blockquote";
};

type CodeBlock = {
  code: string;
  language: string | null;
  type: "code";
};

type RuleBlock = {
  type: "rule";
};

type MarkdownBlock =
  | BlockquoteBlock
  | CodeBlock
  | HeadingBlock
  | ListBlock
  | ParagraphBlock
  | RuleBlock;

function isBlankLine(line: string) {
  return line.trim() === "";
}

function isRuleLine(line: string) {
  return /^([-*_])\1{2,}$/.test(line.trim());
}

function isHeadingLine(line: string) {
  return /^(#{1,6})\s+/.test(line);
}

function isUnorderedListLine(line: string) {
  return /^[-*+]\s+/.test(line);
}

function isOrderedListLine(line: string) {
  return /^\d+\.\s+/.test(line);
}

function parseMarkdownBlocks(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlankLine(line)) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim() || null;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        code: codeLines.join("\n"),
        language,
        type: "code",
      });
      continue;
    }

    if (isHeadingLine(line)) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);

      if (match) {
        blocks.push({
          level: match[1].length,
          text: match[2].trim(),
          type: "heading",
        });
      }

      index += 1;
      continue;
    }

    if (isRuleLine(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].replace(/^>\s?/, "").trimEnd());
        index += 1;
      }

      blocks.push({
        lines: quoteLines,
        type: "blockquote",
      });
      continue;
    }

    if (isUnorderedListLine(line) || isOrderedListLine(line)) {
      const ordered = isOrderedListLine(line);
      const items: string[] = [];
      let currentItem = line.replace(ordered ? /^\d+\.\s+/ : /^[-*+]\s+/, "").trim();
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];

        if (isBlankLine(nextLine)) {
          items.push(currentItem);
          index += 1;
          break;
        }

        const matchesCurrentList = ordered
          ? isOrderedListLine(nextLine)
          : isUnorderedListLine(nextLine);

        if (matchesCurrentList) {
          items.push(currentItem);
          currentItem = nextLine.replace(
            ordered ? /^\d+\.\s+/ : /^[-*+]\s+/,
            "",
          ).trim();
          index += 1;
          continue;
        }

        if (
          isHeadingLine(nextLine) ||
          isRuleLine(nextLine) ||
          nextLine.trim().startsWith(">") ||
          nextLine.trim().startsWith("```") ||
          (!ordered && isOrderedListLine(nextLine)) ||
          (ordered && isUnorderedListLine(nextLine))
        ) {
          break;
        }

        currentItem = `${currentItem} ${nextLine.trim()}`.trim();
        index += 1;
      }

      if (currentItem) {
        items.push(currentItem);
      }

      blocks.push({
        items,
        ordered,
        type: "list",
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const nextLine = lines[index];

      if (
        isBlankLine(nextLine) ||
        isHeadingLine(nextLine) ||
        isRuleLine(nextLine) ||
        nextLine.trim().startsWith(">") ||
        nextLine.trim().startsWith("```") ||
        isUnorderedListLine(nextLine) ||
        isOrderedListLine(nextLine)
      ) {
        break;
      }

      paragraphLines.push(nextLine.trim());
      index += 1;
    }

    blocks.push({
      lines: paragraphLines,
      type: "paragraph",
    });
  }

  return blocks;
}

function findNextInlineToken(text: string) {
  const patterns = [
    { regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/, type: "link" as const },
    { regex: /`([^`]+)`/, type: "code" as const },
    { regex: /\*\*([^*]+)\*\*/, type: "strong" as const },
    { regex: /\*([^*]+)\*/, type: "emphasis" as const },
  ];

  const matches = patterns
    .map(({ regex, type }) => {
      const match = text.match(regex);

      if (!match || match.index === undefined) {
        return null;
      }

      return {
        match,
        type,
      };
    })
    .filter(
      (
        value,
      ): value is {
        match: RegExpMatchArray;
        type: "code" | "emphasis" | "link" | "strong";
      } => Boolean(value),
    )
    .sort((left, right) => left.match.index! - right.match.index!);

  return matches[0] ?? null;
}

function renderInline(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let remainingText = text;
  let tokenIndex = 0;

  while (remainingText) {
    const token = findNextInlineToken(remainingText);

    if (!token) {
      nodes.push(remainingText);
      break;
    }

    const startIndex = token.match.index ?? 0;

    if (startIndex > 0) {
      nodes.push(remainingText.slice(0, startIndex));
    }

    const fullMatch = token.match[0];
    const key = `${keyPrefix}-${tokenIndex}`;

    if (token.type === "link") {
      nodes.push(
        <a
          key={key}
          href={token.match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-text-primary underline decoration-text-muted underline-offset-4 transition hover:decoration-text-primary"
        >
          {renderInline(token.match[1], `${key}-label`)}
        </a>,
      );
    }

    if (token.type === "code") {
      nodes.push(
        <code
          key={key}
          className="rounded bg-sidebar px-1.5 py-0.5 font-mono text-[0.92em] text-text-primary"
        >
          {token.match[1]}
        </code>,
      );
    }

    if (token.type === "strong") {
      nodes.push(
        <strong key={key} className="font-semibold text-text-primary">
          {renderInline(token.match[1], `${key}-strong`)}
        </strong>,
      );
    }

    if (token.type === "emphasis") {
      nodes.push(
        <em key={key} className="italic text-text-primary">
          {renderInline(token.match[1], `${key}-emphasis`)}
        </em>,
      );
    }

    remainingText = remainingText.slice(startIndex + fullMatch.length);
    tokenIndex += 1;
  }

  return nodes;
}

function renderParagraph(lines: string[], key: string) {
  return (
    <p key={key} className="leading-7 text-text-primary/95">
      {renderInline(lines.join(" "), `${key}-inline`)}
    </p>
  );
}

function renderBlock(block: MarkdownBlock, index: number) {
  const key = `block-${index}`;

  if (block.type === "heading") {
    if (block.level === 1) {
      return (
        <h1 key={key} className="text-3xl font-semibold tracking-tight text-text-primary">
          {renderInline(block.text, `${key}-inline`)}
        </h1>
      );
    }

    if (block.level === 2) {
      return (
        <h2 key={key} className="text-2xl font-semibold tracking-tight text-text-primary">
          {renderInline(block.text, `${key}-inline`)}
        </h2>
      );
    }

    return (
      <h3 key={key} className="text-xl font-semibold tracking-tight text-text-primary">
        {renderInline(block.text, `${key}-inline`)}
      </h3>
    );
  }

  if (block.type === "paragraph") {
    return renderParagraph(block.lines, key);
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";

    return (
      <ListTag
        key={key}
        className={`space-y-2 pl-6 leading-7 text-text-primary/95 ${
          block.ordered ? "list-decimal" : "list-disc"
        }`}
      >
        {block.items.map((item, itemIndex) => (
          <li key={`${key}-item-${itemIndex}`}>
            {renderInline(item, `${key}-item-${itemIndex}-inline`)}
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        key={key}
        className="border-l-2 border-border-strong pl-4 text-text-secondary"
      >
        <div className="space-y-3">
          {block.lines.map((line, lineIndex) =>
            renderParagraph([line], `${key}-line-${lineIndex}`),
          )}
        </div>
      </blockquote>
    );
  }

  if (block.type === "code") {
    return (
      <div key={key} className="overflow-hidden rounded-2xl border border-border-subtle bg-sidebar">
        {block.language ? (
          <div className="border-b border-border-subtle px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-text-muted">
            {block.language}
          </div>
        ) : null}
        <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-text-primary">
          <code>{block.code}</code>
        </pre>
      </div>
    );
  }

  return <hr key={key} className="border-border-subtle" />;
}

export function MarkdownDocument({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return <div className="space-y-6">{blocks.map(renderBlock)}</div>;
}
