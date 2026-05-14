// This file renders the job description textarea input.
import type { RefObject } from "react";

type JobFormProps = {
  value: string;
  onChange: (value: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

export function JobForm({ value, onChange, textareaRef }: JobFormProps) {
  return (
    <section className="surface-panel p-6">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
          Job snapshot
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">Job description</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Paste one job post you want to evaluate against your profile.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Job description text</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: We are looking for a frontend engineer with React, TypeScript, accessibility, and design system experience..."
          className="min-h-[220px] w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-4 text-sm leading-7 text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
        />
      </label>
    </section>
  );
}
