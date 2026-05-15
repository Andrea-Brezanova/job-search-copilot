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
      <section className="surface-panel border-[var(--color-line)] bg-[linear-gradient(180deg,#ffffff,#f2e6d2)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl italic leading-none text-[var(--color-navy)]">
              Your application is ready.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Save this application now so you can track it, add follow-ups, and return to it later from your Applications view.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-md border border-[var(--color-navy)] bg-[var(--color-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18314f] disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:bg-[#b8b1a2]"
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
    <section className="surface-panel border-[#c4d5c2] bg-[var(--color-ok-soft)] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-3xl italic leading-none text-[var(--color-ok)]">
            Saved. You can now track this application.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-ok)]">
            Your first saved application is now available in the tracker, where you can update status, generate follow-ups, and keep notes.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewApplications}
          className="rounded-md border border-[#c4d5c2] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ok)] transition hover:bg-[#edf3ec]"
        >
          View in Applications
        </button>
      </div>
    </section>
  );
}
