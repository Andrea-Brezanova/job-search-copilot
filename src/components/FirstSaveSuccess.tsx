"use client";

type FirstSaveSuccessProps = {
  showSavePrompt: boolean;
  hasSavedFirstApplication: boolean;
  isSaving: boolean;
  onSave: () => void;
  onViewApplications: () => void;
};

export function FirstSaveSuccess({
  showSavePrompt,
  hasSavedFirstApplication,
  isSaving,
  onSave,
  onViewApplications,
}: FirstSaveSuccessProps) {
  if (showSavePrompt) {
    return (
      <section className="rounded-2xl border border-brand-300 bg-brand-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Your application is ready.
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Save this application now so you can track it, add follow-ups, and return to it later from your Applications view.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isSaving ? "Saving..." : "Save this application"}
          </button>
        </div>
      </section>
    );
  }

  if (!hasSavedFirstApplication) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-emerald-900">
            Saved. You can now track this application.
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Your first saved application is now available in the tracker, where you can update status, generate follow-ups, and keep notes.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewApplications}
          className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
        >
          View in Applications
        </button>
      </div>
    </section>
  );
}
