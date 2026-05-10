import type { ApplicationStatus, ApplicationUpdateAction } from "@/lib/types";

type ApplicationStatusActionsProps = {
  currentStatus: ApplicationStatus;
  onAction: (action: ApplicationUpdateAction) => Promise<void>;
  isUpdating: boolean;
};

export function ApplicationStatusActions({
  currentStatus,
  onAction,
  isUpdating,
}: ApplicationStatusActionsProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Status actions</h2>
        <p className="mt-1 text-sm text-stone-600">
          Update the application stage and key follow-up milestones.
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Current status
        </p>
        <p className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-sm font-medium capitalize text-stone-800">
          {currentStatus}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <ActionButton
          label="Mark as Applied"
          isUpdating={isUpdating}
          onClick={() => void onAction("mark_applied")}
        />
        <ActionButton
          label="Set Follow-up"
          isUpdating={isUpdating}
          onClick={() => void onAction("set_follow_up")}
        />
        <ActionButton
          label="Move to Interview"
          isUpdating={isUpdating}
          onClick={() => void onAction("move_to_interview")}
        />
        <ActionButton
          label="Reject"
          isUpdating={isUpdating}
          onClick={() => void onAction("mark_rejected")}
        />
        <ActionButton
          label="Archive"
          isUpdating={isUpdating}
          onClick={() => void onAction("archive")}
        />
      </div>
    </section>
  );
}

function ActionButton({
  label,
  isUpdating,
  onClick,
}: {
  label: string;
  isUpdating: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isUpdating}
      className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
