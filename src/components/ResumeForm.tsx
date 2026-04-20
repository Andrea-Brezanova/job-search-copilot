// This file renders the resume or profile textarea input.
type ResumeFormProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ResumeForm({ value, onChange }: ResumeFormProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Resume or Profile</h2>
        <p className="mt-1 text-sm text-stone-600">
          Paste your resume, LinkedIn summary, or background notes.
        </p>
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
