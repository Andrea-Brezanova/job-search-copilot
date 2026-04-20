// This file displays the generated cover letter and email drafts.
import type { ApplicationDocs as ApplicationDocsType } from "@/lib/types";

type ApplicationDocsProps = {
  documents: ApplicationDocsType | null;
};

export function ApplicationDocs({ documents }: ApplicationDocsProps) {
  if (!documents) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">Application Drafts</h2>
        <p className="mt-2 text-sm text-stone-600">
          Your tailored cover letter and professional email will appear here.
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
          <div className="mt-3 rounded-2xl bg-stone-50 p-4 text-sm leading-7 whitespace-pre-wrap text-stone-700">
            {documents.coverLetter}
          </div>
        </article>

        <article>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Application Email
          </h3>
          <div className="mt-3 rounded-2xl bg-stone-50 p-4 text-sm leading-7 whitespace-pre-wrap text-stone-700">
            {documents.applicationEmail}
          </div>
        </article>
      </div>
    </section>
  );
}
