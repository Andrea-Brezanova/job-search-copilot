// This file coordinates the homepage UI and API calls for the MVP flow.
"use client";

import { useState } from "react";
import { ApplicationDocs } from "@/components/ApplicationDocs";
import { FitResult } from "@/components/FitResult";
import { JobForm } from "@/components/JobForm";
import { ResumeForm } from "@/components/ResumeForm";
import type {
  ApplicationDocs as ApplicationDocsType,
  FitAnalysis
} from "@/lib/types";

export function Workspace() {
  const [profileText, setProfileText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [fitResult, setFitResult] = useState<FitAnalysis | null>(null);
  const [applicationDocs, setApplicationDocs] =
    useState<ApplicationDocsType | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleResumeFileChange(file: File | null) {
    // Clear old upload messages each time the user chooses a new file.
    setUploadError("");
    setUploadNote("");
    setUploadSuccess("");
    setUploadedResumeFile(null);
    setUploadedFileName("");

    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!extension || !["txt", "pdf", "doc", "docx"].includes(extension)) {
        throw new Error("Please upload a .txt, .pdf, .doc, or .docx file.");
      }

      // We keep the selected file in state so the page knows a resume file exists,
      // even if that file has not been turned into usable text yet.
      setUploadedResumeFile(file);

      if (extension === "txt") {
        // Text files can be read directly in the browser, so we use them to fill the textarea.
        const textContent = await file.text();
        setProfileText(textContent);
        setUploadSuccess("Text file loaded successfully. Resume text added to the form.");
        return;
      }

      if (extension === "pdf") {
        // PDFs are sent to the backend because the browser should not handle PDF text extraction itself.
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData
        });

        const data = (await response.json()) as {
          extractedText?: string;
          message?: string;
          error?: string;
        };

        if (!response.ok || !data.extractedText) {
          throw new Error(data.error ?? "Unable to parse the uploaded PDF.");
        }

        setProfileText(data.extractedText);
        setUploadSuccess(
          data.message ?? "PDF parsed successfully. Resume text added to the form."
        );
        return;
      }

      // DOC and DOCX files are still stored locally until that parser is added.
      setUploadNote("File uploaded. PDF/DOCX parsing is the next step.");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unable to process the uploaded file."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function analyzeFit() {
    setStatusMessage("");
    setApplicationDocs(null);

    if (!canSubmitWithCurrentResumeInput()) {
      setStatusMessage(
        "File selected, but this format is not parsed yet. Please paste your resume text for now."
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profileText, jobDescription })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to analyze job fit.");
      }

      setFitResult(data as FitAnalysis);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function generateApplication() {
    setStatusMessage("");

    if (!canSubmitWithCurrentResumeInput()) {
      setStatusMessage(
        "File selected, but this format is not parsed yet. Please paste your resume text for now."
      );
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profileText, jobDescription })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate application documents.");
      }

      setApplicationDocs(data as ApplicationDocsType);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // These booleans make the form rules easier to read and maintain.
  const hasResumeText = profileText.trim().length > 0;
  const hasResumeFile = uploadedResumeFile !== null;
  const hasJobText = jobDescription.trim().length > 0;
  const hasUsableResumeInput = hasResumeText || hasResumeFile;
  const isDisabled = !hasJobText || !hasUsableResumeInput;

  function canSubmitWithCurrentResumeInput() {
    // The backend endpoints still need actual resume text, so a file-only state
    // should be blocked until that file has been parsed into the textarea.
    return hasJobText && hasResumeText;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,107,82,0.14),_transparent_35%),linear-gradient(to_bottom,_#f7f6f3,_#f5f5f4)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
            Phase 1 MVP
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Analyze job fit and draft application materials in one place.
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">
            Paste your background and one job description, then generate a quick
            match score, recommendation, cover letter, and professional email.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <ResumeForm
            value={profileText}
            onChange={setProfileText}
            onFileChange={handleResumeFileChange}
            isUploading={isUploading}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            uploadedFileName={uploadedFileName}
            uploadNote={uploadNote}
          />
          <JobForm value={jobDescription} onChange={setJobDescription} />
        </section>

        <section className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={analyzeFit}
            disabled={isDisabled || isAnalyzing}
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Fit"}
          </button>

          <button
            type="button"
            onClick={generateApplication}
            disabled={isDisabled || isGenerating}
            className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
          >
            {isGenerating ? "Generating..." : "Generate Application"}
          </button>
        </section>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusMessage}
          </p>
        ) : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <FitResult result={fitResult} />
          <ApplicationDocs documents={applicationDocs} />
        </section>
      </div>
    </main>
  );
}
