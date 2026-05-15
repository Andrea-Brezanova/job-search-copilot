import type { ApplicationStatus } from "@/lib/types";

type StatusPillTone =
  | ApplicationStatus
  | "follow_up_due"
  | "default";

type StatusPillProps = {
  status?: ApplicationStatus;
  label?: string;
  tone?: StatusPillTone;
  compact?: boolean;
};

const toneClasses: Record<StatusPillTone, string> = {
  default:
    "border-[var(--color-line)] bg-[var(--color-warm)] text-[var(--color-ink-soft)]",
  draft:
    "border-[var(--color-line)] bg-[var(--color-warm)] text-[var(--color-ink-soft)]",
  applied:
    "border-[#cbd7e4] bg-[#e2eaf3] text-[var(--color-navy)]",
  interview:
    "border-[#c4d5c2] bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
  offer:
    "border-[#c4d5c2] bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
  rejected:
    "border-[#ead8d0] bg-[#f6ebe7] text-[#9a4c39]",
  archived:
    "border-[var(--color-line)] bg-[#ece6db] text-[var(--color-muted)]",
  follow_up_due:
    "border-[#e5d1ac] bg-[var(--color-warn-soft)] text-[var(--color-ochre)]",
};

export function StatusPill({
  status,
  label,
  tone,
  compact = false,
}: StatusPillProps) {
  const resolvedTone = tone ?? status ?? "default";
  const resolvedLabel = label ?? status?.replace(/_/g, " ") ?? "Status";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-medium capitalize tracking-[0.01em]",
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        toneClasses[resolvedTone],
      ].join(" ")}
    >
      {resolvedLabel}
    </span>
  );
}
