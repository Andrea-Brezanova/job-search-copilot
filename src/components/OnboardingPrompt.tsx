"use client";

type OnboardingPromptProps = {
  isVisible: boolean;
  canGenerate: boolean;
  isGenerating: boolean;
  hasGeneratedFirstPackage: boolean;
  completedSteps: {
    resume: boolean;
    jobDescription: boolean;
    generation: boolean;
  };
  onGenerate: () => void;
  debugData?: {
    isLoggedIn: boolean;
    applicationsCount: number;
    hasDefaultResume: boolean;
    shouldShowOnboarding: boolean;
  };
};

export function OnboardingPrompt({
  isVisible,
  canGenerate,
  isGenerating,
  hasGeneratedFirstPackage,
  completedSteps,
  onGenerate,
  debugData,
}: OnboardingPromptProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <section className="surface-panel mb-8 border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,234,217,0.88))] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
            Onboarding
          </p>
          <h2 className="mt-2 font-display text-3xl italic leading-none text-[var(--color-navy)]">
            Create your first application package
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Add your resume, paste a job description, and generate your first application package. Once it looks good, save it to start tracking your applications.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="rounded-md border border-[var(--color-ochre)] bg-[var(--color-ochre)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8f5e28] disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:bg-[#b8b1a2]"
        >
          {isGenerating ? "Generating..." : "Generate your first application"}
        </button>
      </div>

      {debugData ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--color-line)] bg-white/70 px-4 py-3 text-xs text-[var(--color-muted)]">
          <p><span className="font-semibold">isLoggedIn:</span> {String(debugData.isLoggedIn)}</p>
          <p><span className="font-semibold">applicationsCount:</span> {debugData.applicationsCount}</p>
          <p><span className="font-semibold">hasDefaultResume:</span> {String(debugData.hasDefaultResume)}</p>
          <p><span className="font-semibold">shouldShowOnboarding:</span> {String(debugData.shouldShowOnboarding)}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <OnboardingChecklistItem
          step="Step 1"
          title="Add your resume"
          completed={completedSteps.resume}
        />
        <OnboardingChecklistItem
          step="Step 2"
          title="Paste a job description"
          completed={completedSteps.jobDescription}
        />
        <OnboardingChecklistItem
          step="Step 3"
          title="Generate your first application"
          completed={completedSteps.generation}
        />
      </div>

      {hasGeneratedFirstPackage ? (
        <p className="mt-4 rounded-xl border border-[#c4d5c2] bg-[var(--color-ok-soft)] px-4 py-3 text-sm text-[var(--color-ok)]">
          Your first application is ready. Save it to track it.
        </p>
      ) : null}
    </section>
  );
}

function OnboardingChecklistItem({
  step,
  title,
  completed,
}: {
  step: string;
  title: string;
  completed: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            completed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[var(--color-warm)] text-[var(--color-muted)]"
          }`}
        >
          {completed ? "✓" : step.replace("Step ", "")}
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
            {step}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {completed ? "Completed" : "Not completed yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
