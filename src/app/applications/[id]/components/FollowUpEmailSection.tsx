import type { ApplicationRecord } from "@/lib/types";

type FollowUpEmailSectionProps = {
  application: ApplicationRecord;
  draft: string;
  message: string;
  isGenerating: boolean;
  onDraftChange: (value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onOpenInGmail: () => void;
};

export function FollowUpEmailSection({
  application,
  draft,
  message,
  isGenerating,
  onDraftChange,
  onGenerate,
  onCopy,
  onOpenInGmail,
}: FollowUpEmailSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Follow-up email
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Generate a short follow-up draft for this saved application.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Generating..." : "Generate follow-up email"}
          </button>
          <button
            type="button"
            onClick={onOpenInGmail}
            disabled={!draft.trim()}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Open follow-up in Gmail
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!draft.trim()}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Copy follow-up email
          </button>
        </div>
      </div>

      {application.status === "draft" ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Follow-ups are usually used after you’ve applied.
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 text-sm text-stone-600">{message}</p>
      ) : null}

      <p className="mt-3 text-xs text-stone-500">
        This opens Gmail with a draft. You can review and send it there.
      </p>

      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="Generate a follow-up email to start editing here."
        className="mt-4 min-h-[220px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </section>
  );
}
