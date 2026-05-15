import type { ApplicationStatus, ApplicationUpdateAction } from "@/lib/types";
import { MetadataPanel } from "@/components/ui/MetadataPanel";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonStyles } from "@/components/ui/buttonStyles";

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
    <MetadataPanel
      title="Status actions"
      description="Update the application stage and key follow-up milestones."
      eyebrow="Workflow actions"
    >
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
          Current status
        </p>
        <div className="mt-2">
          <StatusPill status={currentStatus} />
        </div>
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
    </MetadataPanel>
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
      className={buttonStyles({ variant: "secondary", size: "sm" })}
    >
      {label}
    </button>
  );
}
