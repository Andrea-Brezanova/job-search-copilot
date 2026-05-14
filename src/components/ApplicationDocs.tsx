"use client";

import { useState } from "react";
import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";
import type { ApplicationDocs as ApplicationDocsType } from "@/lib/types";
import { DocumentPanel } from "@/components/ui/DocumentPanel";
import { buttonStyles } from "@/components/ui/buttonStyles";

type ApplicationDocsProps = {
  documents: ApplicationDocsType | null;
  exportFileBaseName?: string;
  applicationEmailGmailSubject?: string;
  applicationEmailGmailTo?: string;
  onChange?: (
    field: keyof ApplicationDocsType,
    value: string
  ) => void;
};

export function ApplicationDocs({
  documents,
  exportFileBaseName,
  applicationEmailGmailSubject,
  applicationEmailGmailTo,
  onChange,
}: ApplicationDocsProps) {
  const [emailCopyMessage, setEmailCopyMessage] = useState("");
  const [coverLetterCopyMessage, setCoverLetterCopyMessage] = useState("");

  if (!documents) {
    return (
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="surface-paper border-dashed p-6">
          <h2 className="font-display text-2xl italic text-[var(--color-navy)]">Cover letter</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Your editable cover letter draft will appear here after generation.
          </p>
        </article>

        <article className="surface-paper border-dashed p-6">
          <h2 className="font-display text-2xl italic text-[var(--color-navy)]">Application email</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
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

  function handleOpenEmailInGmail() {
    const gmailUrl = buildGmailComposeUrl(
      applicationEmailGmailTo,
      applicationEmailGmailSubject,
      currentDocuments.applicationEmail
    );
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
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

  async function handleExportDocx() {
    const document = buildDocxDocument(currentDocuments.coverLetter);
    const blob = await Packer.toBlob(document);
    downloadBlob(
      blob,
      `${baseFileName}.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
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
      <DocumentPanel
        title="Cover letter"
        eyebrow="Document surface"
        description={coverLetterCopyMessage || "Review and edit the letter before you export or save it."}
        actions={
          <>
            <button
              type="button"
              onClick={handleCopyCoverLetter}
              aria-label="Copy cover letter"
              title="Copy cover letter"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Copy
            </button>
            <details className="relative">
              <summary className={`${buttonStyles({ variant: "secondary", size: "sm" })} list-none cursor-pointer`}>
                Export
              </summary>
              <div className="absolute right-0 z-10 mt-2 min-w-[140px] rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-2 shadow-lg">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-ink-soft)] transition hover:bg-[var(--color-warm)]"
                >
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportDocx()}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-ink-soft)] transition hover:bg-[var(--color-warm)]"
                >
                  Export as DOCX
                </button>
              </div>
            </details>
          </>
        }
      >
        <textarea
          value={currentDocuments.coverLetter}
          onChange={(event) => onChange?.("coverLetter", event.target.value)}
          readOnly={!onChange}
          className="font-doc min-h-[420px] w-full rounded-2xl border border-[var(--color-line)] bg-[rgba(255,255,255,0.45)] p-5 text-[15px] leading-8 text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
        />
      </DocumentPanel>

      <DocumentPanel
        title="Application email"
        eyebrow="Outreach draft"
        description={emailCopyMessage || "Open a Gmail draft or copy the email once the wording is ready."}
        actions={
          <>
            <button
              type="button"
              onClick={handleOpenEmailInGmail}
              disabled={!currentDocuments.applicationEmail.trim()}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Open in Gmail
            </button>
            <button
              type="button"
              onClick={handleCopyEmail}
              aria-label="Copy email"
              title="Copy email"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Copy
            </button>
          </>
        }
      >
        <p className="text-xs text-[var(--color-faint)]">
          This opens Gmail with a draft. You can review and send it there.
        </p>

        <textarea
          value={currentDocuments.applicationEmail}
          onChange={(event) =>
            onChange?.("applicationEmail", event.target.value)
          }
          readOnly={!onChange}
          className="font-doc mt-4 min-h-[320px] w-full rounded-2xl border border-[var(--color-line)] bg-[rgba(255,255,255,0.45)] p-5 text-[15px] leading-8 text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
        />
      </DocumentPanel>
    </section>
  );
}

function buildDocxDocument(text: string) {
  const paragraphs = getLetterBlocks(text).flatMap((block, blockIndex, blocks) => {
    const blockParagraphs = block.lines.map((line, lineIndex) =>
      new Paragraph({
        alignment:
          line.align === "justify"
            ? AlignmentType.JUSTIFIED
            : AlignmentType.LEFT,
        spacing: {
          after:
            lineIndex === block.lines.length - 1
              ? blockIndex === blocks.length - 1
                ? 0
                : line.isCompact
                  ? 120
                  : 180
              : 80,
          line: line.isCompact ? 300 : 360,
        },
        children: [
          new TextRun({
            text: line.text,
            font: "Times New Roman",
            size: 24,
            color: "111827",
          }),
        ],
      })
    );

    return blockParagraphs;
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1080,
              bottom: 1440,
              left: 1080,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });
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

function downloadBlob(blob: Blob, fileName: string, type = blob.type) {
  const fileBlob = type ? blob.slice(0, blob.size, type) : blob;
  const url = window.URL.createObjectURL(fileBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
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

function buildGmailComposeUrl(to?: string, subject?: string, body?: string) {
  const params = new URLSearchParams();

  if (to?.trim()) {
    params.set("to", to.trim());
  }

  if (subject?.trim()) {
    params.set("su", subject.trim());
  }

  if (body?.trim()) {
    params.set("body", body);
  }

  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}
