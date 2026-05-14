// This file renders the save-and-track controls shared by the workspace and detail view.
import Link from "next/link";
import type { ApplicationStatus } from "@/lib/types";
import { MetadataPanel } from "@/components/ui/MetadataPanel";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonStyles } from "@/components/ui/buttonStyles";

type ApplicationSavePanelProps = {
  status: ApplicationStatus;
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isDisabled: boolean;
  message: string;
  savedApplicationId?: string | null;
  saveButtonLabel?: string;
};

export function ApplicationSavePanel({
  status,
  notes,
  onNotesChange,
  onSave,
  isSaving,
  isDisabled,
  message,
  savedApplicationId,
  saveButtonLabel = "Save application",
}: ApplicationSavePanelProps) {
  return (
    <MetadataPanel
      title="Save application"
      description="Save your document edits and notes for this application."
      eyebrow="Workflow state"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <article className="surface-warm px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
            Status
          </p>
          <div className="mt-3">
            <StatusPill status={status} />
          </div>
        </article>

        <article className="surface-warm px-4 py-4">
          <label className="block text-sm font-medium text-[var(--color-ink-soft)]">
            Notes
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Optional notes about this application."
              className="mt-2 min-h-[160px] w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-sm leading-7 text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
            />
          </label>
        </article>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isDisabled || isSaving}
          className={buttonStyles({ variant: "primary", size: "lg" })}
        >
          {isSaving ? "Saving..." : saveButtonLabel}
        </button>

        {savedApplicationId ? (
          <Link
            href={`/applications/${savedApplicationId}`}
            className="text-sm font-medium text-[var(--color-navy)] underline-offset-4 hover:underline"
          >
            Open saved application
          </Link>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--color-muted)]">{message}</p> : null}
    </MetadataPanel>
  );
}
