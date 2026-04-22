// This file displays the generated cover letter and email drafts.
import type { ApplicationDocs as ApplicationDocsType } from "@/lib/types";

type ApplicationDocsProps = {
  documents: ApplicationDocsType | null;
  onChange?: (
    field: keyof ApplicationDocsType,
    value: string
  ) => void;
};

export function ApplicationDocs({ documents, onChange }: ApplicationDocsProps) {
  if (!documents) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">Application Drafts</h2>
        <p className="mt-2 text-sm text-stone-600">
          Your editable cover letter and email drafts will appear here after generation.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Application Drafts</h2>

      <div className="mt-6 space-y-6">
        <article>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Cover Letter
          </h3>
          <textarea
            value={documents.coverLetter}
            onChange={(event) => onChange?.("coverLetter", event.target.value)}
            readOnly={!onChange}
            className="mt-3 min-h-[240px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </article>

        <article>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Application Email
          </h3>
          <textarea
            value={documents.applicationEmail}
            onChange={(event) =>
              onChange?.("applicationEmail", event.target.value)
            }
            readOnly={!onChange}
            className="mt-3 min-h-[180px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </article>
      </div>
    </section>
  );
}
