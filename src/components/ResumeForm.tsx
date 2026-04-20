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

      <label className="block">
        <span className="sr-only">Resume or profile text</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: Product designer with 5 years of experience in B2B SaaS, user research, and cross-functional collaboration..."
          className="min-h-[260px] w-full rounded-xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>
    </section>
  );
}
