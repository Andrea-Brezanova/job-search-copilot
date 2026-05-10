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
    <section className="mb-8 rounded-3xl border border-brand-300 bg-[linear-gradient(180deg,rgba(222,238,228,1),rgba(249,250,249,1))] p-6 shadow-lg ring-1 ring-brand-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Onboarding
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            Create your first application package
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Add your resume, paste a job description, and generate your first application package. Once it looks good, save it to start tracking your applications.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isGenerating ? "Generating..." : "Generate your first application"}
        </button>
      </div>

      {debugData ? (
        <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white/70 px-4 py-3 text-xs text-stone-600">
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
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            completed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {completed ? "✓" : step.replace("Step ", "")}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {step}
          </p>
          <p className="mt-1 text-sm font-medium text-stone-900">{title}</p>
          <p className="mt-1 text-sm text-stone-600">
            {completed ? "Completed" : "Not completed yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
