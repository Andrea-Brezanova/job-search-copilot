"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

const statusFilters: Array<{
  label: string;
  value: "all" | ApplicationStatus;
}> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
  { label: "Archived", value: "archived" },
];

export default function ApplicationsPage() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<"all" | ApplicationStatus>(
    "all",
  );

  useEffect(() => {
    async function loadApplications() {
      setIsPageLoading(true);
      setErrorMessage("");

      if (isAuthLoading) {
        return;
      }

      try {
        const accessToken = session?.access_token ?? "";

        if (!accessToken) {
          throw new Error("Please log in to view your saved applications.");
        }

        const response = await fetch("/api/applications", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load applications.");
        }

        setApplications(data as ApplicationRecord[]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred.",
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    if (!isAuthLoading) {
      void loadApplications();
    }
  }, [isAuthLoading, session]);

  const isLoading = isAuthLoading || isPageLoading;
  const isLoggedOut = !isAuthLoading && !session;

  const sortedApplications = useMemo(
    () =>
      [...applications].sort((left, right) => {
        const leftNeedsAttention = needsAttention(left);
        const rightNeedsAttention = needsAttention(right);

        if (leftNeedsAttention !== rightNeedsAttention) {
          return leftNeedsAttention ? -1 : 1;
        }

        const leftFollowUp = left.follow_up_at
          ? new Date(left.follow_up_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightFollowUp = right.follow_up_at
          ? new Date(right.follow_up_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        if (leftFollowUp !== rightFollowUp) {
          return leftFollowUp - rightFollowUp;
        }

        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      }),
    [applications],
  );

  const filteredApplications = useMemo(
    () =>
      sortedApplications.filter((application) =>
        selectedStatus === "all" ? true : application.status === selectedStatus,
      ),
    [selectedStatus, sortedApplications],
  );

  const groupedApplications = useMemo(() => {
    const followUpsDue = filteredApplications.filter((application) =>
      needsAttention(application),
    );
    const activeApplications = filteredApplications.filter(
      (application) =>
        !needsAttention(application) &&
        (application.status === "applied" || application.status === "interview"),
    );
    const archivedApplications = filteredApplications.filter(
      (application) =>
        application.status === "rejected" || application.status === "archived",
    );
    const otherApplications = filteredApplications.filter(
      (application) =>
        !followUpsDue.some((item) => item.id === application.id) &&
        !activeApplications.some((item) => item.id === application.id) &&
        !archivedApplications.some((item) => item.id === application.id),
    );

    return {
      followUpsDue,
      activeApplications,
      archivedApplications,
      otherApplications,
    };
  }, [filteredApplications]);

  const summary = useMemo(
    () => ({
      total: applications.length,
      applied: applications.filter((application) => application.status === "applied")
        .length,
      interview: applications.filter(
        (application) => application.status === "interview",
      ).length,
      rejected: applications.filter(
        (application) => application.status === "rejected",
      ).length,
      followUpsDue: applications.filter((application) => needsAttention(application))
        .length,
    }),
    [applications],
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          Applications Dashboard
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
          Track what needs attention and keep your application pipeline organized.
        </h1>
      </header>

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-600">Loading applications...</p>
      ) : null}

      {!isLoading && isLoggedOut ? (
        <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-600">
            Sign in to view and manage your saved applications.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Go to workspace
          </Link>
        </section>
      ) : null}

      {!isLoading && !isLoggedOut && applications.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-600">
            No saved applications yet. Generate one from the workspace first.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Go to workspace
          </Link>
        </section>
      ) : null}

      {!isLoading && !isLoggedOut && applications.length > 0 ? (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total applications" value={summary.total} />
            <SummaryCard label="Applied" value={summary.applied} />
            <SummaryCard label="Interview" value={summary.interview} />
            <SummaryCard label="Rejected" value={summary.rejected} />
            <SummaryCard
              label="Follow-ups due"
              value={summary.followUpsDue}
              tone={summary.followUpsDue > 0 ? "alert" : "default"}
            />
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Filter by status
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusFilters.map((filter) => {
                const isActive = selectedStatus === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedStatus(filter.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-brand-700 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-8 grid gap-8">
            <ApplicationsSection
              title="Follow-ups due"
              description="Applied roles that are ready for follow-up today or are already overdue."
              applications={groupedApplications.followUpsDue}
              emptyState="No follow-ups are due right now."
              highlightTone="alert"
            />

            <ApplicationsSection
              title="Active applications"
              description="Applications still in motion, including active submissions and interviews."
              applications={groupedApplications.activeApplications}
              emptyState="No active applications match this filter."
            />

            <ApplicationsSection
              title="Archived / Closed"
              description="Rejected and archived applications you may want to reference later."
              applications={groupedApplications.archivedApplications}
              emptyState="No closed applications match this filter."
            />

            {groupedApplications.otherApplications.length > 0 ? (
              <ApplicationsSection
                title="Other applications"
                description="Drafts, offers, and other applications outside the main tracking buckets."
                applications={groupedApplications.otherApplications}
                emptyState="No additional applications match this filter."
              />
            ) : null}
          </div>
        </>
      ) : null}

      {!isLoading &&
      !isLoggedOut &&
      applications.length > 0 &&
      filteredApplications.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-600">
            No applications match the selected status filter.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "alert";
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        tone === "alert"
          ? "border-amber-200 bg-amber-50"
          : "border-stone-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold ${
          tone === "alert" ? "text-amber-800" : "text-stone-900"
        }`}
      >
        {value}
      </p>
    </article>
  );
}

function ApplicationsSection({
  title,
  description,
  applications,
  emptyState,
  highlightTone = "default",
}: {
  title: string;
  description: string;
  applications: ApplicationRecord[];
  emptyState: string;
  highlightTone?: "default" | "alert";
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-600">{emptyState}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              highlightTone={highlightTone}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ApplicationCard({
  application,
  highlightTone,
}: {
  application: ApplicationRecord;
  highlightTone: "default" | "alert";
}) {
  const isOverdue = needsAttention(application);

  return (
    <article
      className={`rounded-2xl border p-6 shadow-sm ${
        highlightTone === "alert" || isOverdue
          ? "border-amber-200 bg-amber-50/50"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-stone-900">
            {application.role_title}
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            {application.company_name ?? "Company not parsed yet"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={application.status} />
          <Link
            href={`/applications/${application.id}`}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
          >
            View details
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MetadataItem label="Applied">
          {formatDate(application.applied_at)}
        </MetadataItem>
        <MetadataItem label="Follow-up">
          <span
            className={isOverdue ? "font-semibold text-rose-700" : undefined}
          >
            {formatDate(application.follow_up_at)}
          </span>
        </MetadataItem>
        <MetadataItem label="Added">{formatDate(application.created_at)}</MetadataItem>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const statusStyles: Record<ApplicationStatus, string> = {
    draft: "bg-stone-100 text-stone-700",
    applied: "bg-brand-100 text-brand-800",
    interview: "bg-sky-100 text-sky-800",
    offer: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    archived: "bg-stone-200 text-stone-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function MetadataItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-sm text-stone-700">{children}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function needsAttention(application: ApplicationRecord) {
  if (application.status !== "applied" || !application.follow_up_at) {
    return false;
  }

  return new Date(application.follow_up_at).getTime() <= Date.now();
}
