import type { ApplicationRecord } from "@/lib/types";
import { DocumentPanel } from "@/components/ui/DocumentPanel";
import { buttonStyles } from "@/components/ui/buttonStyles";

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
    <DocumentPanel
      title="Follow-up email"
      description={message || "Generate a short follow-up draft for this saved application."}
      eyebrow="Follow-up draft"
      actions={
        <>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className={buttonStyles({ variant: "ochre", size: "sm" })}
          >
            {isGenerating ? "Generating..." : "Generate follow-up email"}
          </button>
          <button
            type="button"
            onClick={onOpenInGmail}
            disabled={!draft.trim()}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Open follow-up in Gmail
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!draft.trim()}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Copy follow-up email
          </button>
        </>
      }
    >

      {application.status === "draft" ? (
        <p className="rounded-xl border border-[#e5d1ac] bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-ochre)]">
          Follow-ups are usually used after you’ve applied.
        </p>
      ) : null}

      <p className="mt-3 text-xs text-[var(--color-faint)]">
        This opens Gmail with a draft. You can review and send it there.
      </p>

      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="Generate a follow-up email to start editing here."
        className="font-doc mt-4 min-h-[240px] w-full rounded-2xl border border-[var(--color-line)] bg-[rgba(255,255,255,0.45)] p-5 text-[15px] leading-8 text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
      />
    </DocumentPanel>
  );
}
