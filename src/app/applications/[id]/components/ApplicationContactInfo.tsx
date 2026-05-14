type ApplicationContactInfoProps = {
  contactName: string;
  contactEmail: string;
  jobUrl: string;
  onContactNameChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
  onJobUrlChange: (value: string) => void;
};

import { MetadataPanel } from "@/components/ui/MetadataPanel";

export function ApplicationContactInfo({
  contactName,
  contactEmail,
  jobUrl,
  onContactNameChange,
  onContactEmailChange,
  onJobUrlChange,
}: ApplicationContactInfoProps) {
  return (
    <MetadataPanel
      title="Contact & source"
      description="Save the recruiter contact details and the source link for later follow-ups."
      eyebrow="Metadata"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
          <span className="font-medium text-[var(--color-ink)]">Contact name</span>
          <input
            type="text"
            value={contactName}
            onChange={(event) => onContactNameChange(event.target.value)}
            placeholder="Hiring manager or recruiter"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
          />
        </label>

        <label className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
          <span className="font-medium text-[var(--color-ink)]">Contact email</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => onContactEmailChange(event.target.value)}
            placeholder="recruiter@example.com"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
          />
        </label>

        <label className="grid gap-2 text-sm text-[var(--color-ink-soft)] md:col-span-2">
          <span className="font-medium text-[var(--color-ink)]">Job URL</span>
          <input
            type="url"
            value={jobUrl}
            onChange={(event) => onJobUrlChange(event.target.value)}
            placeholder="https://company.com/jobs/role"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink-soft)] outline-none transition focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy-soft)]"
          />
        </label>
      </div>
    </MetadataPanel>
  );
}
