import type { ReactNode } from "react";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";
import { DocumentPanel } from "@/components/ui/DocumentPanel";
import { MetadataPanel } from "@/components/ui/MetadataPanel";
import { MetricStrip } from "@/components/ui/MetricStrip";
import { StatusPill } from "@/components/ui/StatusPill";

type ApplicationOverviewProps = {
  application: ApplicationRecord;
  jobUrl: string;
};

export function ApplicationOverview({
  application,
  jobUrl,
}: ApplicationOverviewProps) {
  return (
    <>
      <header className="surface-paper p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
          Application record
        </p>
        <h1 className="mt-3 font-display text-4xl italic leading-none text-[var(--color-navy)]">
          {application.role_title}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          {application.company_name ?? "Company not parsed yet"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill status={application.status} />
          {application.follow_up_at && application.status === "applied" ? (
            <StatusPill label="Follow-up scheduled" tone="follow_up_due" />
          ) : null}
        </div>
      </header>

      <MetadataPanel
        title="Application overview"
        description="Track the current state of this application and review the key dates."
        eyebrow="Workflow state"
      >
        <MetricStrip
          items={[
            { label: "Status", value: capitalizeStatus(application.status) },
            { label: "Created", value: formatDate(application.created_at) },
            { label: "Updated", value: formatDate(application.updated_at) },
            { label: "Applied", value: formatDate(application.applied_at) },
            { label: "Follow-up", value: formatDate(application.follow_up_at) },
            { label: "Archived", value: formatDate(application.archived_at) },
          ]}
          columnsClassName="md:grid-cols-2 xl:grid-cols-3"
        />
      </MetadataPanel>

      <DocumentPanel
        title="Job details"
        description="Review the original job context alongside the generated application drafts."
        eyebrow="Context"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <OverviewMetric
            label="Location"
            value={application.location_text ?? "Not available"}
          />
          <OverviewMetric
            label="Job URL"
            value={jobUrl ? (
              <a
                href={jobUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-navy)] underline-offset-4 hover:underline"
              >
                Open job posting
              </a>
            ) : "Not available"}
          />
          <OverviewMetric
            label="Fit score"
            value={application.fit_score?.toString() ?? "N/A"}
          />
          <OverviewMetric
            label="Job source"
            value={application.job_source_type ?? "manual_text"}
          />
        </div>

        <div className="surface-warm mt-4 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
            Fit summary
          </p>
          <p className="mt-2 font-doc text-[15px] leading-8 text-[var(--color-ink-soft)]">
            {application.fit_summary ?? "No fit summary saved."}
          </p>
        </div>

        <details className="mt-4 rounded-xl border border-[var(--color-line)] bg-[rgba(255,255,255,0.45)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            Original job description
          </summary>
          <div className="border-t border-[var(--color-line)] px-4 py-4">
            <pre className="font-doc max-h-80 overflow-auto whitespace-pre-wrap text-[15px] leading-8 text-[var(--color-ink-soft)]">
              {application.raw_job_text}
            </pre>
          </div>
        </details>
      </DocumentPanel>
    </>
  );
}

function OverviewMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="surface-warm px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
        {label}
      </p>
      <div className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{value}</div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function capitalizeStatus(status: ApplicationStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
