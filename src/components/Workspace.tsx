"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationDocs } from "@/components/ApplicationDocs";
import { ApplicationSavePanel } from "@/components/ApplicationSavePanel";
import { FirstSaveSuccess } from "@/components/FirstSaveSuccess";
import { GenerationProgressIndicator } from "@/components/GenerationProgressIndicator";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { useAuth } from "@/components/AuthProvider";
import { FitResult } from "@/components/FitResult";
import { JobForm } from "@/components/JobForm";
import { ResumeForm } from "@/components/ResumeForm";
import { useApplicationGeneration } from "@/hooks/useApplicationGeneration";
import { useDefaultResume } from "@/hooks/useDefaultResume";
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser";
import { useResumeUpload } from "@/hooks/useResumeUpload";
import type {
  ApplicationDocs as ApplicationDocsType,
  FitAnalysis,
} from "@/lib/types";

export function Workspace() {
  const isDev = process.env.NODE_ENV !== "production";
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const userId = session?.user.id ?? null;
  const isLoggedIn = Boolean(session?.user);
  const jobDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [savedApplicationId, setSavedApplicationId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const generation = useApplicationGeneration();
  const firstTimeUser = useFirstTimeUser({
    isLoggedIn,
    accessToken,
    userId,
  });
  const resumeUpload = useResumeUpload({
    onResumeChanged: () => {
      generation.resetGeneratedPackage();
      firstTimeUser.resetFirstSaveState();
      setSavedApplicationId(null);
      setSaveMessage("");
    },
  });
  const defaultResume = useDefaultResume({
    userId,
    accessToken,
    currentProfileText: resumeUpload.profileText,
    setProfileText: resumeUpload.setProfileTextDirectly,
  });

  const applicationPackage = generation.applicationPackage;
  const hasResumeText = resumeUpload.profileText.trim().length > 0;
  const hasResumeFile = resumeUpload.uploadedResumeFile !== null;
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
  const applicationEmailGmailSubject = buildApplicationEmailSubject(
    applicationPackage?.parsedJob.title,
    applicationPackage?.parsedJob.company,
  );
  const shouldShowOnboarding = firstTimeUser.shouldShowOnboarding;
  const shouldShowFirstSavePrompt =
    shouldShowOnboarding &&
    firstTimeUser.hasGeneratedFirstPackage &&
    Boolean(applicationPackage) &&
    !firstTimeUser.hasSavedFirstApplication;

  function canSubmitWithCurrentResumeInput() {
    return hasJobText && hasResumeText;
  }

  useEffect(() => {
    if (!shouldShowOnboarding || !hasResumeText || hasJobText) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      jobDescriptionRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasJobText, hasResumeText, shouldShowOnboarding]);

  function handleProfileTextChange(value: string) {
    resumeUpload.handleProfileTextChange(value);
    defaultResume.clearUsageState();
  }

  async function handleResumeFileChange(file: File | null) {
    defaultResume.clearUsageState();
    await resumeUpload.handleFileUpload(file);
  }

  function handleJobDescriptionChange(value: string) {
    setJobDescription(value);
    generation.resetGeneratedPackage();
    firstTimeUser.resetFirstSaveState();
    setSavedApplicationId(null);
    setSaveMessage("");
  }

  async function generateApplicationPackage() {
    generation.clearStatusMessage();
    setSaveMessage("");
    setSavedApplicationId(null);
    firstTimeUser.resetFirstSaveState();

    if (!canSubmitWithCurrentResumeInput()) {
      generation.setStatusMessage(
        "Please upload a resume / CV before generating your application package.",
      );
      return;
    }

    await generation.handleGenerateClick(
      resumeUpload.profileText,
      jobDescription,
      () => {
        firstTimeUser.markFirstGenerated();
        setSaveMessage(
          "Application package generated. Review the drafts, then save your application.",
        );
      },
    );
  }

  async function saveApplication() {
    generation.clearStatusMessage();
    setSaveMessage("");

    if (!applicationPackage) {
      generation.setStatusMessage("Generate an application package before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const isFirstSaveForUser = firstTimeUser.applicationsCount === 0;

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
          profileText: resumeUpload.profileText,
          uploadedFileName: resumeUpload.uploadedFileName,
          jobDescription,
          fitAnalysis: applicationPackage.fitAnalysis,
          parsedProfile: applicationPackage.parsedProfile,
          parsedJob: applicationPackage.parsedJob,
          documents: applicationPackage.documents,
          status: generation.status,
          notes: generation.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save the application.");
      }

      setSavedApplicationId((data as { id: string }).id);
      setSaveMessage(
        isFirstSaveForUser
          ? "Saved. You can now track this application."
          : "Application saved to Supabase.",
      );
      firstTimeUser.markFirstSaved(isFirstSaveForUser);

      if (!isFirstSaveForUser) {
        router.push("/applications");
      }
    } catch (error) {
      generation.setStatusMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,107,82,0.14),_transparent_35%),linear-gradient(to_bottom,_#f7f6f3,_#f5f5f4)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <OnboardingPrompt
          isVisible={shouldShowOnboarding}
          canGenerate={canSubmitWithCurrentResumeInput() && !generation.isGenerating}
          isGenerating={generation.isGenerating}
          hasGeneratedFirstPackage={firstTimeUser.hasGeneratedFirstPackage}
          completedSteps={{
            resume: hasResumeText,
            jobDescription: hasJobText,
            generation: firstTimeUser.hasGeneratedFirstPackage,
          }}
          onGenerate={() => void generateApplicationPackage()}
          debugData={
            isDev
              ? {
                  isLoggedIn,
                  applicationsCount: firstTimeUser.applicationsCount,
                  hasDefaultResume: defaultResume.hasDefaultResume,
                  shouldShowOnboarding,
                }
              : undefined
          }
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <ResumeForm
            onChange={handleProfileTextChange}
            onFileChange={(file) => void handleResumeFileChange(file)}
            isUploading={resumeUpload.isUploading}
            uploadError={resumeUpload.uploadError}
            uploadSuccess={resumeUpload.uploadSuccess}
            uploadedFileName={resumeUpload.uploadedFileName}
            uploadNote={resumeUpload.uploadNote}
            isDefaultResumeLoading={defaultResume.isLoading}
            isSavingDefaultResume={defaultResume.isSaving}
            defaultResumeMessage={defaultResume.defaultResumeMessage}
            defaultResumeError={defaultResume.defaultResumeError}
            isUsingSavedResume={defaultResume.isUsingSavedResume}
            showDefaultResumeActions={Boolean(session?.user)}
            canSaveDefaultResume={Boolean(resumeUpload.profileText.trim())}
            onSaveDefaultResume={() =>
              void defaultResume.saveDefault(
                resumeUpload.profileText,
                resumeUpload.uploadedFileName || null,
              )
            }
          />
          <JobForm
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            textareaRef={jobDescriptionRef}
          />
        </section>

        <section className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => void generateApplicationPackage()}
            disabled={isDisabled || generation.isGenerating}
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {generation.isGenerating ? "Generating..." : "Generate application package"}
          </button>

          <GenerationProgressIndicator
            isGenerating={generation.isGenerating}
            stageText={generation.generationStages[generation.generationStageIndex]}
          />
        </section>

        {generation.statusMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {generation.statusMessage}
          </p>
        ) : null}

        {applicationPackage ? (
          <section className="mt-8 grid gap-6">
            <FirstSaveSuccess
              showSavePrompt={shouldShowFirstSavePrompt}
              hasSavedFirstApplication={firstTimeUser.hasSavedFirstApplication}
              isSaving={isSaving}
              onSave={() => void saveApplication()}
              onViewApplications={() => router.push("/applications")}
            />

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
                  applicationEmailGmailSubject={applicationEmailGmailSubject}
                  applicationEmailGmailTo=""
                  onChange={generation.handleDocumentsChange}
                />
              </div>
            </section>

            <ApplicationSavePanel
              status={generation.status}
              notes={generation.notes}
              onNotesChange={generation.handleNotesChange}
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

function buildApplicationEmailSubject(role?: string, company?: string) {
  const normalizedRole = role?.trim() || "this role";
  const normalizedCompany = company?.trim();

  return normalizedCompany
    ? `Application for ${normalizedRole} at ${normalizedCompany}`
    : `Application for ${normalizedRole}`;
}
