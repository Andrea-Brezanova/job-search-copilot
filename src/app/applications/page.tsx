"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/ui/AppShell";
import { ApplicationRow } from "@/components/ui/ApplicationRow";
import { MetadataPanel } from "@/components/ui/MetadataPanel";
import { MetricStrip } from "@/components/ui/MetricStrip";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
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
    <AppShell width="wide">
      <PageHeader
        eyebrow="Applications"
        title="Applications"
        description="Track what needs attention, keep your drafts moving, and scan the pipeline without losing the document context behind each role."
      />

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-[var(--color-muted)]">Loading applications...</p>
      ) : null}

      {!isLoading && isLoggedOut ? (
        <section className="surface-panel mt-6 border-dashed p-6">
          <p className="text-sm text-[var(--color-muted)]">
            Sign in to view and manage your saved applications.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-[var(--color-navy)] underline-offset-4 hover:underline"
          >
            Go to workspace
          </Link>
        </section>
      ) : null}

      {!isLoading && !isLoggedOut && applications.length === 0 ? (
        <section className="surface-panel mt-6 border-dashed p-6">
          <p className="text-sm text-[var(--color-muted)]">
            No saved applications yet. Generate one from the workspace first.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-[var(--color-navy)] underline-offset-4 hover:underline"
          >
            Go to workspace
          </Link>
        </section>
      ) : null}

      {!isLoading && !isLoggedOut && applications.length > 0 ? (
        <>
          <div className="mt-6">
            <MetricStrip
              items={[
                { label: "Total applications", value: summary.total },
                { label: "Applied", value: summary.applied },
                { label: "Interview", value: summary.interview },
                { label: "Rejected", value: summary.rejected },
                {
                  label: "Follow-ups due",
                  value: summary.followUpsDue,
                  tone: summary.followUpsDue > 0 ? "alert" : "default",
                },
              ]}
            />
          </div>

          <MetadataPanel
            title="Status filter"
            description="Trim the pipeline to the stage you want to review."
            eyebrow="Operational scan"
            className="mt-6"
          >
            <div className="mt-3 flex flex-wrap gap-2">
              {statusFilters.map((filter) => {
                const isActive = selectedStatus === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedStatus(filter.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                        : "border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-navy)]/35 hover:text-[var(--color-navy)]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </MetadataPanel>

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
        <section className="surface-panel mt-6 border-dashed p-6">
          <p className="text-sm text-[var(--color-muted)]">
            No applications match the selected status filter.
          </p>
        </section>
      ) : null}
    </AppShell>
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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
            {title}
          </h2>
          {highlightTone === "alert" ? (
            <StatusPill label="Due" tone="follow_up_due" compact />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      </div>

      {applications.length === 0 ? (
        <div className="surface-panel border-dashed p-6">
          <p className="text-sm text-[var(--color-muted)]">{emptyState}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <ApplicationRow
              key={application.id}
              application={application}
              isOverdue={highlightTone === "alert" || needsAttention(application)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function needsAttention(application: ApplicationRecord) {
  if (application.status !== "applied" || !application.follow_up_at) {
    return false;
  }

  return new Date(application.follow_up_at).getTime() <= Date.now();
}
