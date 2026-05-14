// This file displays the structured job-fit analysis returned by the API.
import type { FitAnalysis } from "@/lib/types";
import { MetadataPanel } from "@/components/ui/MetadataPanel";

type FitResultProps = {
  result: FitAnalysis | null;
  collapsedByDefault?: boolean;
};

const recommendationClasses: Record<FitAnalysis["recommendation"], string> = {
  Apply: "border-[#c4d5c2] bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
  Maybe: "border-[#e5d1ac] bg-[var(--color-warn-soft)] text-[var(--color-ochre)]",
  Skip: "border-[#ead8d0] bg-[#f6ebe7] text-[#9a4c39]"
};

export function FitResult({
  result,
  collapsedByDefault = false
}: FitResultProps) {
  if (!result) {
    return (
      <section className="surface-panel border-dashed p-6">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Fit Summary</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          A brief fit summary will appear here after the application package is generated.
        </p>
      </section>
    );
  }

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
            Fit analysis
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">Fit Summary</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{result.reasoning}</p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-[var(--color-navy)]">{result.fitScore}/100</div>
          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${recommendationClasses[result.recommendation]}`}
          >
            {result.recommendation}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
            Strengths
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-ink-soft)]">
            {result.strengths.map((item) => (
              <li key={item} className="surface-warm px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
            Gaps
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-ink-soft)]">
            {result.gaps.map((item) => (
              <li key={item} className="surface-warm px-3 py-2">
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
      <MetadataPanel title="Fit Summary" description="Open the saved fit analysis for this application." eyebrow="Compatibility snapshot">
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--color-ink)]">
            View Fit Summary
          </summary>
          <div className="mt-4">{content}</div>
        </details>
      </MetadataPanel>
    );
  }

  return (
    <MetadataPanel title="Fit Summary" description="Review the generated strengths, gaps, and recommendation." eyebrow="Compatibility snapshot">
      {content}
    </MetadataPanel>
  );
}
