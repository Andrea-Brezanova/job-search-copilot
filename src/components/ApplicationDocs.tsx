"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import type { ApplicationDocs as ApplicationDocsType } from "@/lib/types";

type ApplicationDocsProps = {
  documents: ApplicationDocsType | null;
  exportFileBaseName?: string;
  onChange?: (
    field: keyof ApplicationDocsType,
    value: string
  ) => void;
};

export function ApplicationDocs({
  documents,
  exportFileBaseName,
  onChange,
}: ApplicationDocsProps) {
  const [emailCopyMessage, setEmailCopyMessage] = useState("");
  const [coverLetterCopyMessage, setCoverLetterCopyMessage] = useState("");

  if (!documents) {
    return (
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">Cover letter</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your editable cover letter draft will appear here after generation.
          </p>
        </article>

        <article className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">Application email</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your editable email draft will appear here after generation.
          </p>
        </article>
      </section>
    );
  }

  const currentDocuments = documents;
  const baseFileName = buildExportFileBaseName(exportFileBaseName);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(currentDocuments.applicationEmail);
      setEmailCopyMessage("Email copied.");
      window.setTimeout(() => setEmailCopyMessage(""), 2000);
    } catch {
      setEmailCopyMessage("Unable to copy email.");
      window.setTimeout(() => setEmailCopyMessage(""), 2000);
    }
  }

  async function handleCopyCoverLetter() {
    try {
      await navigator.clipboard.writeText(currentDocuments.coverLetter);
      setCoverLetterCopyMessage("Cover letter copied.");
      window.setTimeout(() => setCoverLetterCopyMessage(""), 2000);
    } catch {
      setCoverLetterCopyMessage("Unable to copy cover letter.");
      window.setTimeout(() => setCoverLetterCopyMessage(""), 2000);
    }
  }

  function handleExportDoc() {
    const blob = new Blob([buildWordDocument(currentDocuments.coverLetter)], {
      type: "application/msword",
    });
    downloadBlob(blob, `${baseFileName}.doc`);
  }

  function handleExportPdf() {
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 54;
    const marginRight = 54;
    const marginTop = 64;
    const marginBottom = 64;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const lineHeight = 18;
    const compactLineHeight = 16;
    const paragraphGap = 14;
    let cursorY = marginTop;

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);

    const blocks = getLetterBlocks(currentDocuments.coverLetter);

    blocks.forEach((block, blockIndex) => {
      const wrappedLines = block.lines.flatMap((blockLine) =>
        wrapPdfLines(doc, blockLine.text, contentWidth).map((line, lineIndex, lines) => ({
          text: line,
          align: blockLine.align,
          isLastWrappedLine: lineIndex === lines.length - 1,
          isCompact: blockLine.isCompact,
        }))
      );
      const blockHeight = wrappedLines.reduce(
        (total, line) => total + (line.isCompact ? compactLineHeight : lineHeight),
        0
      );

      if (cursorY + blockHeight > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }

      wrappedLines.forEach((wrappedLine) => {
        const currentLineHeight = wrappedLine.isCompact ? compactLineHeight : lineHeight;

        if (cursorY + currentLineHeight > pageHeight - marginBottom) {
            doc.addPage();
          cursorY = marginTop;
        }

        writePdfLine(
          doc,
          wrappedLine.text,
          marginLeft,
          cursorY,
          contentWidth,
          wrappedLine.isLastWrappedLine,
          wrappedLine.align
        );
        cursorY += currentLineHeight;
      });

      if (blockIndex < blocks.length - 1) {
        cursorY += paragraphGap;
      }
    });
 
    doc.save(`${baseFileName}.pdf`);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Cover letter</h2>
            {coverLetterCopyMessage ? (
              <p className="mt-1 text-xs text-stone-500">{coverLetterCopyMessage}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyCoverLetter}
              aria-label="Copy cover letter"
              title="Copy cover letter"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              <span aria-hidden="true" className="text-base leading-none">⧉</span>
            </button>
            <details className="relative">
              <summary className="list-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700 cursor-pointer">
                Export
              </summary>
              <div className="absolute right-0 z-10 mt-2 min-w-[140px] rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                >
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportDoc}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                >
                  Export as DOC
                </button>
              </div>
            </details>
          </div>
        </div>

        <textarea
          value={currentDocuments.coverLetter}
          onChange={(event) => onChange?.("coverLetter", event.target.value)}
          readOnly={!onChange}
          className="mt-4 min-h-[360px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </article>

      <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Application email</h2>
            {emailCopyMessage ? (
              <p className="mt-1 text-xs text-stone-500">{emailCopyMessage}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            aria-label="Copy email"
            title="Copy email"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
          >
            <span aria-hidden="true" className="text-base leading-none">⧉</span>
          </button>
        </div>

        <textarea
          value={currentDocuments.applicationEmail}
          onChange={(event) =>
            onChange?.("applicationEmail", event.target.value)
          }
          readOnly={!onChange}
          className="mt-4 min-h-[260px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </article>
    </section>
  );
}

function buildWordDocument(text: string) {
  const blocks = getLetterBlocks(text)
    .map((block) =>
      block.lines
        .map(
          (line) =>
            `<p style="margin: 0 0 ${line.isCompact ? "4pt" : "12pt"}; text-align: ${line.align};">${escapeHtml(line.text)}</p>`
        )
        .join("")
    )
    .join('<div style="height: 8pt;"></div>');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Cover letter</title>
      </head>
      <body style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.6; margin: 1in; color: #111827;">
        ${blocks}
      </body>
    </html>
  `;
}

function writePdfLine(
  doc: jsPDF,
  line: string,
  x: number,
  y: number,
  width: number,
  isLastLine: boolean,
  align: "left" | "justify"
) {
  const trimmedLine = line.trim();
  const words = trimmedLine.split(/\s+/).filter(Boolean);

  if (align === "left" || isLastLine || words.length <= 1) {
    doc.text(trimmedLine, x, y);
    return;
  }

  const wordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
  const gapCount = words.length - 1;
  const gapWidth = (width - wordsWidth) / gapCount;
  let cursorX = x;

  words.forEach((word, index) => {
    doc.text(word, cursorX, y);
    cursorX += doc.getTextWidth(word);

    if (index < gapCount) {
      cursorX += gapWidth;
    }
  });
}

function wrapPdfLines(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text, width) as string[];
}

function getLetterBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map((lines) => ({
      lines: shouldSplitIntoCompactLines(lines)
        ? lines.map((line) => ({
            text: line,
            align: "left" as const,
            isCompact: true,
          }))
        : [
            {
              text: lines.join(" "),
              align: shouldLeftAlignParagraph(lines.join(" ")) ? ("left" as const) : ("justify" as const),
              isCompact: false,
            },
          ],
    }));
}

function shouldSplitIntoCompactLines(lines: string[]) {
  return lines.some((line) => /^best regards[,!]?$/i.test(line)) || lines.some((line) => line.includes("@"));
}

function shouldLeftAlignParagraph(paragraph: string) {
  if (paragraph.includes("@")) {
    return true;
  }

  return (
    /^dear\b/i.test(paragraph) ||
    /^best regards[,!]?$/i.test(paragraph) ||
    /^sincerely[,!]?$/i.test(paragraph) ||
    paragraph.split(/\s+/).length <= 4
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExportFileBaseName(baseName?: string) {
  const normalizedBaseName = (baseName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const truncatedBaseName = normalizedBaseName.slice(0, 80).replace(/-+$/g, "");

  return truncatedBaseName
    ? `cover-letter-${truncatedBaseName}`
    : "cover-letter";
}
