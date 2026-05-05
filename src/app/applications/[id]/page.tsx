"use client";

// This file shows one saved application and lets the user edit drafts, notes, and status.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ApplicationDocs } from "@/components/ApplicationDocs";
import { ApplicationSavePanel } from "@/components/ApplicationSavePanel";
import { useAuth } from "@/components/AuthProvider";
import type {
  ApplicationDocs as ApplicationDocsType,
  ApplicationRecord,
  ApplicationStatus
} from "@/lib/types";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { isLoading: isAuthLoading, session } = useAuth();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocsType | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>("draft");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadApplication() {
      setIsPageLoading(true);
      setErrorMessage("");

      if (isAuthLoading) {
        return;
      }

      try {
        const accessToken = session?.access_token ?? "";

        if (!accessToken) {
          throw new Error("Please log in to view this application.");
        }

        const response = await fetch(`/api/applications/${params.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load application.");
        }

        const record = data as ApplicationRecord;
        setApplication(record);
        setDocuments({
          coverLetter: record.cover_letter_draft,
          applicationEmail: record.email_draft
        });
        setStatus(record.status);
        setNotes(record.notes ?? "");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred."
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    if (params.id && !isAuthLoading) {
      void loadApplication();
    }
  }, [isAuthLoading, params.id, session]);

  const isLoading = isAuthLoading || !params.id || isPageLoading;
  const isLoggedOut = !isAuthLoading && !session;

  function handleDocumentsChange(
    field: keyof ApplicationDocsType,
    value: string
  ) {
    setDocuments((currentDocuments) => {
      if (!currentDocuments) {
        return currentDocuments;
      }

      return {
        ...currentDocuments,
        [field]: value
      };
    });
  }

  async function saveApplication() {
    if (!documents) {
      return;
    }

    setErrorMessage("");
    setSaveMessage("");
    setIsSaving(true);

    try {
      const accessToken = session?.access_token ?? "";

      if (!accessToken) {
        throw new Error("Please log in to update this application.");
      }

      const response = await fetch(`/api/applications/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          coverLetterDraft: documents.coverLetter,
          emailDraft: documents.applicationEmail,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save application changes.");
      }

      const updatedRecord = data as ApplicationRecord;
      setApplication(updatedRecord);
      setStatus(updatedRecord.status);
      setSaveMessage("Changes saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
        <p className="text-sm text-stone-600">Loading application...</p>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
        {isLoggedOut ? (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
            <p className="text-sm text-stone-600">
              Sign in to view saved application details.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              Go to workspace
            </Link>
          </section>
        ) : (
          <p className="text-sm text-stone-600">Application not found.</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <Link
        href="/applications"
        className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
      >
        Back to applications
      </Link>

      <header className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
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

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6">
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
              value={
                application.job_url ? (
                  <a
                    href={application.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 underline-offset-4 hover:underline"
                  >
                    Open job posting
                  </a>
                ) : (
                  "Not available"
                )
              }
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

        <ApplicationDocs
          documents={documents}
          exportFileBaseName={[application.role_title, application.company_name]
            .filter(Boolean)
            .join(" ")}
          onChange={handleDocumentsChange}
        />
        <ApplicationSavePanel
          status={status}
          notes={notes}
          onNotesChange={setNotes}
          onSave={saveApplication}
          isSaving={isSaving}
          isDisabled={!documents}
          message={saveMessage}
          savedApplicationId={application.id}
        />
      </section>
    </main>
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
