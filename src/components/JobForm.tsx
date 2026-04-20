// This file renders the job description textarea input.
type JobFormProps = {
  value: string;
  onChange: (value: string) => void;
};

export function JobForm({ value, onChange }: JobFormProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Job Description</h2>
        <p className="mt-1 text-sm text-stone-600">
          Paste one job post you want to evaluate against your profile.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Job description text</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: We are looking for a frontend engineer with React, TypeScript, accessibility, and design system experience..."
          className="min-h-[260px] w-full rounded-xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>
    </section>
  );
}
