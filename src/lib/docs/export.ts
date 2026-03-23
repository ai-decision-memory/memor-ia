import { normalizeDocTitle } from "./title";

type PdfFont = "bold" | "mono" | "regular";

type PdfLine = {
  font: PdfFont;
  lineHeight: number;
  marginAfter: number;
  size: number;
  text: string | null;
};

const PDF_PAGE_HEIGHT = 792;
const PDF_PAGE_WIDTH = 612;
const PDF_BOTTOM_MARGIN = 56;
const PDF_LEFT_MARGIN = 54;
const PDF_TOP_START = 742;

function sanitizeInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");
}

function normalizePdfText(value: string) {
  return sanitizeInlineMarkdown(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trimEnd();
}

function buildPdfLines(markdown: string) {
  const pdfLines: PdfLine[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let isInCodeBlock = false;

  for (const line of lines) {
    const trimmedLine = line.trimEnd();
    const normalizedLine = normalizePdfText(trimmedLine);

    if (trimmedLine.trim().startsWith("```")) {
      isInCodeBlock = !isInCodeBlock;
      pdfLines.push({
        font: "regular",
        lineHeight: 8,
        marginAfter: 0,
        size: 12,
        text: null,
      });
      continue;
    }

    if (isInCodeBlock) {
      pdfLines.push({
        font: "mono",
        lineHeight: 12,
        marginAfter: 1,
        size: 10,
        text: normalizedLine || " ",
      });
      continue;
    }

    if (trimmedLine.trim() === "") {
      pdfLines.push({
        font: "regular",
        lineHeight: 10,
        marginAfter: 0,
        size: 12,
        text: null,
      });
      continue;
    }

    const headingMatch = normalizedLine.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const size = level === 1 ? 22 : level === 2 ? 18 : 15;

      pdfLines.push({
        font: "bold",
        lineHeight: size + 6,
        marginAfter: 4,
        size,
        text: headingMatch[2],
      });
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmedLine.trim())) {
      pdfLines.push({
        font: "regular",
        lineHeight: 10,
        marginAfter: 0,
        size: 12,
        text: null,
      });
      continue;
    }

    if (/^[-*+]\s+/.test(trimmedLine)) {
      pdfLines.push({
        font: "regular",
        lineHeight: 16,
        marginAfter: 0,
        size: 12,
        text: `- ${normalizedLine.replace(/^[-*+]\s+/, "")}`,
      });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      pdfLines.push({
        font: "regular",
        lineHeight: 16,
        marginAfter: 0,
        size: 12,
        text: normalizedLine,
      });
      continue;
    }

    if (/^>\s?/.test(trimmedLine)) {
      pdfLines.push({
        font: "regular",
        lineHeight: 16,
        marginAfter: 0,
        size: 12,
        text: `> ${normalizedLine.replace(/^>\s?/, "")}`,
      });
      continue;
    }

    pdfLines.push({
      font: "regular",
      lineHeight: 16,
      marginAfter: 2,
      size: 12,
      text: normalizedLine,
    });
  }

  return pdfLines;
}

function wrapPdfText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return [text];
  }

  const words = text.split(/\s+/);
  const wrappedLines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) {
      continue;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxChars) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    if (word.length <= maxChars) {
      currentLine = word;
      continue;
    }

    for (let index = 0; index < word.length; index += maxChars) {
      const slice = word.slice(index, index + maxChars);

      if (slice.length === maxChars) {
        wrappedLines.push(slice);
      } else {
        currentLine = slice;
      }
    }
  }

  if (currentLine) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
}

function getMaxChars(size: number, font: PdfFont) {
  if (font === "mono") {
    return 86;
  }

  if (size >= 22) {
    return 42;
  }

  if (size >= 18) {
    return 54;
  }

  if (size >= 15) {
    return 64;
  }

  return 88;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfPages(lines: PdfLine[]) {
  const pages: string[] = [];
  let operations: string[] = [];
  let cursorY = PDF_TOP_START;

  const pushPage = () => {
    pages.push(operations.join("\n"));
    operations = [];
    cursorY = PDF_TOP_START;
  };

  for (const line of lines) {
    if (line.text === null) {
      cursorY -= line.lineHeight;

      if (cursorY <= PDF_BOTTOM_MARGIN) {
        pushPage();
      }

      continue;
    }

    const wrappedLines = wrapPdfText(line.text, getMaxChars(line.size, line.font));
    const fontName =
      line.font === "bold" ? "F2" : line.font === "mono" ? "F3" : "F1";

    for (const wrappedLine of wrappedLines) {
      if (cursorY <= PDF_BOTTOM_MARGIN) {
        pushPage();
      }

      operations.push(
        `BT /${fontName} ${line.size} Tf ${PDF_LEFT_MARGIN} ${cursorY} Td (${escapePdfText(wrappedLine)}) Tj ET`,
      );
      cursorY -= line.lineHeight;
    }

    cursorY -= line.marginAfter;
  }

  if (operations.length > 0 || pages.length === 0) {
    pushPage();
  }

  return pages;
}

export function buildDocDownloadName(title: string, extension: "md" | "pdf") {
  const baseName = normalizeDocTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "document"}.${extension}`;
}

export function createMarkdownExport(markdown: string) {
  return `${markdown.trimEnd()}\n`;
}

export function createPdfExport(markdown: string) {
  const pages = buildPdfPages(buildPdfLines(markdown));
  const fontRegularObjectId = 3;
  const fontBoldObjectId = 4;
  const fontMonoObjectId = 5;
  let nextObjectId = 6;
  const pageObjects: Array<{ content: string; contentObjectId: number; pageObjectId: number }> = [];

  for (const pageContent of pages) {
    pageObjects.push({
      content: pageContent,
      contentObjectId: nextObjectId + 1,
      pageObjectId: nextObjectId,
    });
    nextObjectId += 2;
  }

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjects
      .map((page) => `${page.pageObjectId} 0 R`)
      .join(" ")}] /Count ${pageObjects.length} >>\nendobj`,
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`,
  ];

  for (const page of pageObjects) {
    const contentLength = new TextEncoder().encode(page.content).length;

    objects.push(
      `${page.pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularObjectId} 0 R /F2 ${fontBoldObjectId} 0 R /F3 ${fontMonoObjectId} 0 R >> >> /Contents ${page.contentObjectId} 0 R >>\nendobj`,
    );
    objects.push(
      `${page.contentObjectId} 0 obj\n<< /Length ${contentLength} >>\nstream\n${page.content}\nendstream\nendobj`,
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
