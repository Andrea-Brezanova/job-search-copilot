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

  if (!documents) {
    return (
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">Cover Letter</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your editable cover letter draft will appear here after generation.
          </p>
        </article>

        <article className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">Application Email</h2>
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

  function handleExportDoc() {
    const blob = new Blob([buildWordDocument(currentDocuments.coverLetter)], {
      type: "application/msword",
    });
    downloadBlob(blob, `${baseFileName}.doc`);
  }

  function handleExportPdf() {
    const doc = new jsPDF({
      unit: "pt",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 72;
    const marginY = 72;
    const contentWidth = pageWidth - marginX * 2;
    const lineHeight = 19;
    const paragraphGap = 12;
    let cursorY = marginY;

    doc.setFont("times", "normal");
    doc.setFontSize(11.5);

    const paragraphs = getLetterParagraphs(currentDocuments.coverLetter);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const lines = doc.splitTextToSize(paragraph.text, contentWidth) as string[];

      lines.forEach((line, lineIndex) => {
        if (cursorY > pageHeight - marginY) {
          doc.addPage();
          cursorY = marginY;
        }

        const isLastLine = lineIndex === lines.length - 1;
        writePdfLine(
          doc,
          line,
          marginX,
          cursorY,
          contentWidth,
          isLastLine,
          paragraph.align
        );
        cursorY += lineHeight;
      });

      if (paragraphIndex < paragraphs.length - 1) {
        cursorY += paragraphGap;
      }
    });

    doc.save(`${baseFileName}.pdf`);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">Cover Letter</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleExportDoc}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Export DOC
            </button>
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
            <h2 className="text-lg font-semibold text-stone-900">Application Email</h2>
            {emailCopyMessage ? (
              <p className="mt-1 text-xs text-stone-500">{emailCopyMessage}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
          >
            Copy Email
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
  const paragraphs = getLetterParagraphs(text)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 12pt; text-align: ${paragraph.align};">${escapeHtml(paragraph.text)}</p>`
    )
    .join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Cover Letter</title>
      </head>
      <body style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.6; margin: 1in; color: #111827;">
        ${paragraphs}
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

function getLetterParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((paragraph) => ({
      text: paragraph,
      align: (shouldLeftAlignParagraph(paragraph) ? "left" : "justify") as
        | "left"
        | "justify",
    }));
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

  return normalizedBaseName ? `cover-letter-${normalizedBaseName}` : "cover-letter";
}
