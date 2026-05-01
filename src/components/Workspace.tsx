// This file coordinates the homepage UI and API calls for the MVP flow.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationDocs } from "@/components/ApplicationDocs";
import { ApplicationSavePanel } from "@/components/ApplicationSavePanel";
import { useAuth } from "@/components/AuthProvider";
import { FitResult } from "@/components/FitResult";
import { JobForm } from "@/components/JobForm";
import { ResumeForm } from "@/components/ResumeForm";
import type {
  ApplicationDocs as ApplicationDocsType,
  ApplicationPackage,
  ApplicationStatus,
  FitAnalysis,
} from "@/lib/types";

export function Workspace() {
  const router = useRouter();
  const { session } = useAuth();
  const generationStages = [
    "Reading your resume...",
    "Reading the job description...",
    "Extracting key skills and responsibilities...",
    "Matching your background to the role...",
    "Drafting your cover letter and email...",
    "Still drafting your application package..."
  ];
  const [profileText, setProfileText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(
    null,
  );
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [applicationPackage, setApplicationPackage] =
    useState<ApplicationPackage | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>("draft");
  const [notes, setNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStageIndex, setGenerationStageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedApplicationId, setSavedApplicationId] = useState<string | null>(
    null,
  );
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setGenerationStageIndex((currentIndex) =>
        Math.min(currentIndex + 1, generationStages.length - 1)
      );
    }, 1600);

    return () => window.clearInterval(intervalId);
  }, [generationStages.length, isGenerating]);

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
        handleProfileTextChange(textContent);
        setUploadSuccess(
          "Text file loaded successfully. Resume text added to the form.",
        );
        return;
      }

      if (extension === "pdf") {
        // PDFs are sent to the backend because the browser should not handle PDF text extraction itself.
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          extractedText?: string;
          message?: string;
          error?: string;
        };

        if (!response.ok || !data.extractedText) {
          throw new Error(data.error ?? "Unable to parse the uploaded PDF.");
        }

        handleProfileTextChange(data.extractedText);
        setUploadSuccess(
          data.message ??
            "PDF parsed successfully. Resume text added to the form.",
        );
        return;
      }

      // DOC and DOCX files are still stored locally until that parser is added.
      setUploadNote("File uploaded. PDF/DOCX parsing is the next step.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to process the uploaded file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleProfileTextChange(value: string) {
    setProfileText(value);
    setApplicationPackage(null);
    setSavedApplicationId(null);
    setSaveMessage("");
  }

  function handleJobDescriptionChange(value: string) {
    setJobDescription(value);
    setApplicationPackage(null);
    setSavedApplicationId(null);
    setSaveMessage("");
  }

  function handleDocumentsChange(
    field: keyof ApplicationDocsType,
    value: string,
  ) {
    setApplicationPackage((currentPackage) => {
      if (!currentPackage) {
        return currentPackage;
      }

      return {
        ...currentPackage,
        documents: {
          ...currentPackage.documents,
          [field]: value,
        },
      };
    });
  }

  async function generateApplicationPackage() {
    setStatusMessage("");
    setSaveMessage("");
    setSavedApplicationId(null);

    if (!canSubmitWithCurrentResumeInput()) {
      setStatusMessage(
        "Please upload a resume / CV before generating your application package.",
      );
      return;
    }

    setIsGenerating(true);
    setGenerationStageIndex(0);

    try {
      console.log("RESUME_TEXT_PREVIEW:", profileText.slice(0, 200));
      console.log("JOB_DESC_PREVIEW:", jobDescription.slice(0, 200));

      const response = await fetch("/api/generate-application-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileText, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "We could not generate the application package. Please try again.",
        );
      }

      setApplicationPackage(data as ApplicationPackage);
      setSaveMessage(
        "Application package generated. Review the drafts, then save your application.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsGenerating(false);
      setGenerationStageIndex(0);
    }
  }

  async function saveApplication() {
    setStatusMessage("");
    setSaveMessage("");

    if (!applicationPackage) {
      setStatusMessage("Generate an application package before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const accessToken = session?.access_token ?? "";

      if (!accessToken) {
        throw new Error("Please log in to save your application.");
      }

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          profileText,
          uploadedFileName,
          jobDescription,
          fitAnalysis: applicationPackage.fitAnalysis,
          parsedJob: applicationPackage.parsedJob,
          documents: applicationPackage.documents,
          status,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save the application.");
      }

      setSavedApplicationId((data as { id: string }).id);
      setSaveMessage("Application saved to Supabase.");
      router.push("/applications");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // These booleans make the form rules easier to read and maintain.
  const hasResumeText = profileText.trim().length > 0;
  const hasResumeFile = uploadedResumeFile !== null;
  const hasJobText = jobDescription.trim().length > 0;
  const hasUsableResumeInput = hasResumeText || hasResumeFile;
  const isDisabled = !hasJobText || !hasUsableResumeInput;
  const fitResult: FitAnalysis | null = applicationPackage?.fitAnalysis ?? null;
  const applicationDocs: ApplicationDocsType | null =
    applicationPackage?.documents ?? null;
  const exportFileBaseName = buildDraftExportFileBaseName(
    applicationPackage?.parsedJob.title,
    applicationPackage?.parsedJob.company,
  );

  function canSubmitWithCurrentResumeInput() {
    // The backend endpoints still need extracted resume text, so generation stays blocked
    // until the uploaded file has been parsed successfully.
    return hasJobText && hasResumeText;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,107,82,0.14),_transparent_35%),linear-gradient(to_bottom,_#f7f6f3,_#f5f5f4)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
            Your job search made easy
          </p>
          <h1 className="mt-4 text-center text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Application Package Generator
          </h1>
          <p className="mt-4 text-center text-base leading-7 text-stone-600">
            Create a tailored cover letter and email for each job application. 
          </p>
          <p className="mt-4 text-center text-base leading-7 text-stone-600">
            Save all your applications in one place. 
          </p>
          <p className="mt-4 text-center text-base leading-7 text-stone-600">
            Track your job search progress.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <ResumeForm
            onChange={handleProfileTextChange}
            onFileChange={handleResumeFileChange}
            isUploading={isUploading}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            uploadedFileName={uploadedFileName}
            uploadNote={uploadNote}
          />
          <JobForm
            value={jobDescription}
            onChange={handleJobDescriptionChange}
          />
        </section>

        <section className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={generateApplicationPackage}
            disabled={isDisabled || isGenerating}
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isGenerating ? "Generating..." : "Generate application package"}
          </button>

          {isGenerating ? (
            <p className="mt-3 text-center text-sm text-stone-600">
              {generationStages[generationStageIndex]}
            </p>
          ) : null}
        </section>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusMessage}
          </p>
        ) : null}

        {applicationPackage ? (
          <section className="mt-8 grid gap-6">
            <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    Generated package
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Review your drafts, make any edits you want, then save this
                    package to track it in your Applications view.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <ApplicationDocs
                  documents={applicationDocs}
                  exportFileBaseName={exportFileBaseName}
                  onChange={handleDocumentsChange}
                />
              </div>
            </section>

            <ApplicationSavePanel
              status={status}
              notes={notes}
              onStatusChange={setStatus}
              onNotesChange={setNotes}
              onSave={saveApplication}
              isSaving={isSaving}
              isDisabled={!applicationPackage}
              message={saveMessage}
              savedApplicationId={savedApplicationId}
              saveButtonLabel="Save application"
            />

            {!session ? (
              <p className="text-sm text-stone-600">
                You can generate without logging in. Sign in to save applications and view your saved list.
              </p>
            ) : null}

            <FitResult result={fitResult} collapsedByDefault />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function buildDraftExportFileBaseName(role?: string, company?: string) {
  return [role, company].filter(Boolean).join(" ");
}
