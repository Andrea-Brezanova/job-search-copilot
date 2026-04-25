 "use client";

import { useEffect, useRef, useState } from "react";

// This file renders the resume or profile textarea input.
type ResumeFormProps = {
  value: string;
  onChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  isUploading: boolean;
  uploadError: string;
  uploadSuccess: string;
  uploadedFileName: string;
  uploadNote: string;
};

export function ResumeForm({
  value,
  onChange,
  onFileChange,
  isUploading,
  uploadError,
  uploadSuccess,
  uploadedFileName,
  uploadNote
}: ResumeFormProps) {
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);
  const hadResumeContentRef = useRef(false);
  const hasResumeContent = value.trim().length > 0 || Boolean(uploadedFileName);

  useEffect(() => {
    if (hasResumeContent && !hadResumeContentRef.current) {
      setIsEditorExpanded(false);
    }

    hadResumeContentRef.current = hasResumeContent;
  }, [hasResumeContent]);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Resume or Profile</h2>
        <p className="mt-1 text-sm text-stone-600">
          Paste your resume, LinkedIn summary, or background notes.
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-700">
          Upload Resume File
        </label>
        <p className="mt-1 text-xs text-stone-500">
          Accepted formats: `.txt`, `.pdf`, `.doc`, `.docx`
        </p>

        <input
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          className="mt-3 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-900"
        />

        {isUploading ? (
          <p className="mt-2 text-sm text-stone-600">Uploading resume file...</p>
        ) : null}

        {uploadedFileName ? (
          <p className="mt-2 text-sm text-stone-600">Selected file: {uploadedFileName}</p>
        ) : null}

        {uploadNote ? (
          <p className="mt-2 text-sm text-amber-700">{uploadNote}</p>
        ) : null}

        {uploadError ? (
          <p className="mt-2 text-sm text-rose-700">{uploadError}</p>
        ) : null}

        {uploadSuccess ? (
          <p className="mt-2 text-sm text-emerald-700">{uploadSuccess}</p>
        ) : null}
      </div>

      {hasResumeContent && !isEditorExpanded ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-800">Resume text loaded</p>
              <p className="mt-1 text-xs text-stone-500">
                {value.trim().length} characters available for generation
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditorExpanded(true)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Edit Resume Text
            </button>
          </div>
        </div>
      ) : (
        <div>
          {hasResumeContent ? (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditorExpanded(false)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                Collapse Resume Text
              </button>
            </div>
          ) : null}

          <label className="block">
            <span className="sr-only">Resume or profile text</span>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Example: Product designer with 5 years of experience in B2B SaaS, user research, and cross-functional collaboration..."
              className="min-h-[260px] w-full rounded-xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
      )}
    </section>
  );
}
