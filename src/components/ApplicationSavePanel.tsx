// This file renders the save-and-track controls shared by the workspace and detail view.
import Link from "next/link";
import type { ApplicationStatus } from "@/lib/types";

type ApplicationSavePanelProps = {
  status: ApplicationStatus;
  notes: string;
  onStatusChange: (value: ApplicationStatus) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isDisabled: boolean;
  message: string;
  savedApplicationId?: string | null;
};

export function ApplicationSavePanel({
  status,
  notes,
  onStatusChange,
  onNotesChange,
  onSave,
  isSaving,
  isDisabled,
  message,
  savedApplicationId
}: ApplicationSavePanelProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Save and Track</h2>
        <p className="mt-1 text-sm text-stone-600">
          Save the generated package to Supabase and keep the application status updated.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="block text-sm font-medium text-stone-700">
          Status
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as ApplicationStatus)
            }
            className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="draft">draft</option>
            <option value="applied">applied</option>
            <option value="interview">interview</option>
            <option value="rejected">rejected</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Notes
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Optional notes about this application."
            className="mt-2 min-h-[140px] w-full rounded-xl border border-stone-300 px-3 py-2 text-sm leading-6 text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isDisabled || isSaving}
          className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isSaving ? "Saving..." : "Save Application"}
        </button>

        {savedApplicationId ? (
          <Link
            href={`/applications/${savedApplicationId}`}
            className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Open saved application
          </Link>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-stone-600">{message}</p> : null}
    </section>
  );
}
