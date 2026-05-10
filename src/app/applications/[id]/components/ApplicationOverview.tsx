import type { ReactNode } from "react";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

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
      <header className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">
          {application.role_title}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {application.company_name ?? "Company not parsed yet"}
        </p>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Status
          </p>
          <p className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-sm font-medium capitalize text-stone-800">
            {application.status}
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Application overview
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Track the current state of this application and review the key dates.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewMetric label="Role" value={application.role_title} />
          <OverviewMetric
            label="Company"
            value={application.company_name ?? "Not available"}
          />
          <OverviewMetric label="Status" value={capitalizeStatus(application.status)} />
          <OverviewMetric
            label="Location"
            value={application.location_text ?? "Not available"}
          />
          <OverviewMetric label="Created" value={formatDate(application.created_at)} />
          <OverviewMetric label="Updated" value={formatDate(application.updated_at)} />
          <OverviewMetric label="Applied" value={formatDate(application.applied_at)} />
          <OverviewMetric
            label="Follow-up"
            value={formatDate(application.follow_up_at)}
          />
          <OverviewMetric
            label="Archived"
            value={formatDate(application.archived_at)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Job details</h2>
          <p className="mt-1 text-sm text-stone-600">
            Review the original job context alongside the generated application drafts.
          </p>
        </div>

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
                className="text-brand-700 underline-offset-4 hover:underline"
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

        <div className="mt-4 rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Fit summary
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            {application.fit_summary ?? "No fit summary saved."}
          </p>
        </div>

        <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-stone-800">
            Original job description
          </summary>
          <div className="border-t border-stone-200 px-4 py-4">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {application.raw_job_text}
            </pre>
          </div>
        </details>
      </section>
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
    <div className="rounded-xl bg-stone-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <div className="mt-2 text-sm leading-6 text-stone-800">{value}</div>
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
