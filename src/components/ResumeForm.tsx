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
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Resume / CV</h2>
        <p className="mt-1 text-sm text-stone-600">
          Upload your resume to generate your application package.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">
          Upload resume / CV file
        </label>
        <p className="mt-1 text-xs text-stone-500">
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
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
            <label
              htmlFor="resume-file-input"
              className="cursor-pointer rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
            >
              Choose File
            </label>
            <span className="flex min-w-0 items-center gap-2 text-sm text-stone-700">
              <span aria-hidden="true">📄</span>
              <span className="truncate">{uploadedFileName}</span>
            </span>
            <button
              type="button"
              onClick={handleClearResume}
              className="ml-auto cursor-pointer text-gray-500 transition hover:text-black"
              aria-label="Clear uploaded resume"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <label
              htmlFor="resume-file-input"
              className="inline-flex cursor-pointer items-center rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
            >
              Choose File
            </label>
          </div>
        )}

        {isUploading ? (
          <p className="mt-3 text-sm text-stone-600">Uploading resume file...</p>
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
          <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {isUsingSavedResume
                    ? "Using saved resume"
                    : "Save this resume for next time"}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {isUsingSavedResume
                    ? "Your saved resume was loaded into the workspace."
                    : "Save your current resume text so it loads automatically when you sign in."}
                </p>
              </div>
              <button
                type="button"
                onClick={onSaveDefaultResume}
                disabled={!canSaveDefaultResume || isSavingDefaultResume}
                className="rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-500 hover:text-brand-900 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
              >
                {isSavingDefaultResume ? "Saving..." : "Save as default resume"}
              </button>
            </div>

            {isDefaultResumeLoading ? (
              <p className="mt-3 text-sm text-stone-600">Checking for your saved resume...</p>
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
