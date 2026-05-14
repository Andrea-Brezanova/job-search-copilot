"use client";

// This file renders the resume or profile textarea input.
type ResumeFormProps = {
  onChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  isUploading: boolean;
  uploadError: string;
  uploadSuccess: string;
  uploadedFileName: string;
  uploadNote: string;
  isDefaultResumeLoading?: boolean;
  isSavingDefaultResume?: boolean;
  defaultResumeMessage?: string;
  defaultResumeError?: string;
  isUsingSavedResume?: boolean;
  showDefaultResumeActions?: boolean;
  canSaveDefaultResume?: boolean;
  onSaveDefaultResume?: () => void;
};

export function ResumeForm({
  onChange,
  onFileChange,
  isUploading,
  uploadError,
  uploadSuccess,
  uploadedFileName,
  uploadNote,
  isDefaultResumeLoading = false,
  isSavingDefaultResume = false,
  defaultResumeMessage = "",
  defaultResumeError = "",
  isUsingSavedResume = false,
  showDefaultResumeActions = false,
  canSaveDefaultResume = false,
  onSaveDefaultResume,
}: ResumeFormProps) {
  function handleClearResume() {
    onChange("");
    onFileChange(null);
  }

  return (
    <section className="surface-panel p-6">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
          Workspace input
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">Resume / CV</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Upload your resume to generate your application package.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink-soft)]">
          Upload resume / CV file
        </label>
        <p className="mt-1 text-xs text-[var(--color-faint)]">
          Accepted formats: `.txt`, `.pdf`, `.doc`, `.docx`
        </p>

        <input
          id="resume-file-input"
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          className="sr-only"
        />

        {uploadedFileName ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-3">
            <label
              htmlFor="resume-file-input"
              className="cursor-pointer rounded-md border border-[var(--color-navy)] bg-[var(--color-navy)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#18314f]"
            >
              Choose File
            </label>
            <span className="flex min-w-0 items-center gap-2 text-sm text-[var(--color-ink-soft)]">
              <span aria-hidden="true">📄</span>
              <span className="truncate">{uploadedFileName}</span>
            </span>
            <button
              type="button"
              onClick={handleClearResume}
              className="ml-auto cursor-pointer text-[var(--color-faint)] transition hover:text-[var(--color-ink)]"
              aria-label="Clear uploaded resume"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <label
              htmlFor="resume-file-input"
              className="inline-flex cursor-pointer items-center rounded-md border border-[var(--color-navy)] bg-[var(--color-navy)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#18314f]"
            >
              Choose File
            </label>
          </div>
        )}

        {isUploading ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">Uploading resume file...</p>
        ) : null}

        {uploadNote ? (
          <p className="mt-3 text-sm text-amber-700">{uploadNote}</p>
        ) : null}

        {uploadError ? (
          <p className="mt-3 text-sm text-rose-700">{uploadError}</p>
        ) : null}

        {uploadSuccess ? (
          <p className="mt-3 text-sm text-emerald-700">{uploadSuccess}</p>
        ) : null}

        {showDefaultResumeActions ? (
          <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {isUsingSavedResume
                    ? "Using saved resume"
                    : "Save this resume for next time"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {isUsingSavedResume
                    ? "Your saved resume was loaded into the workspace."
                    : "Save your current resume text so it loads automatically when you sign in."}
                </p>
              </div>
              <button
                type="button"
                onClick={onSaveDefaultResume}
                disabled={!canSaveDefaultResume || isSavingDefaultResume}
                className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-ink-soft)] transition hover:border-[var(--color-navy)]/35 hover:text-[var(--color-navy)] disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:text-[var(--color-faint)]"
              >
                {isSavingDefaultResume ? "Saving..." : "Save as default resume"}
              </button>
            </div>

            {isDefaultResumeLoading ? (
              <p className="mt-3 text-sm text-[var(--color-muted)]">Checking for your saved resume...</p>
            ) : null}

            {defaultResumeMessage ? (
              <p className="mt-3 text-sm text-emerald-700">{defaultResumeMessage}</p>
            ) : null}

            {defaultResumeError ? (
              <p className="mt-3 text-sm text-rose-700">{defaultResumeError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
