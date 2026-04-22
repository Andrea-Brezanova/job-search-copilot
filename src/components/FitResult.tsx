// This file displays the structured job-fit analysis returned by the API.
import type { FitAnalysis } from "@/lib/types";

type FitResultProps = {
  result: FitAnalysis | null;
  collapsedByDefault?: boolean;
};

const recommendationClasses: Record<FitAnalysis["recommendation"], string> = {
  Apply: "bg-emerald-100 text-emerald-800",
  Maybe: "bg-amber-100 text-amber-800",
  Skip: "bg-rose-100 text-rose-800"
};

export function FitResult({
  result,
  collapsedByDefault = false
}: FitResultProps) {
  if (!result) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">Fit Summary</h2>
        <p className="mt-2 text-sm text-stone-600">
          A brief fit summary will appear here after the application package is generated.
        </p>
      </section>
    );
  }

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Fit Summary</h2>
          <p className="mt-1 text-sm text-stone-600">{result.reasoning}</p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-brand-700">{result.fitScore}/100</div>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${recommendationClasses[result.recommendation]}`}
          >
            {result.recommendation}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Strengths
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {result.strengths.map((item) => (
              <li key={item} className="rounded-xl bg-stone-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Gaps
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {result.gaps.map((item) => (
              <li key={item} className="rounded-xl bg-stone-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );

  if (collapsedByDefault) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-stone-900">
            View Fit Summary
          </summary>
          <div className="mt-4">{content}</div>
        </details>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {content}
    </section>
  );
}
