"use client";

// This file lists saved applications from Supabase.
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [selectedStatus, setSelectedStatus] = useState<"all" | ApplicationStatus>("all");

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
          error instanceof Error ? error.message : "An unexpected error occurred."
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
  const sortedApplications = [...applications].sort((left, right) => {
    const leftNeedsAttention = needsAttention(left);
    const rightNeedsAttention = needsAttention(right);

    if (leftNeedsAttention !== rightNeedsAttention) {
      return leftNeedsAttention ? -1 : 1;
    }

    const leftFollowUp = left.follow_up_at ? new Date(left.follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightFollowUp = right.follow_up_at ? new Date(right.follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftFollowUp !== rightFollowUp) {
      return leftFollowUp - rightFollowUp;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
  const attentionItems = sortedApplications.filter((application) =>
    needsAttention(application),
  );
  const filteredApplications = sortedApplications.filter((application) =>
    selectedStatus === "all" ? true : application.status === selectedStatus,
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          Saved Applications
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
          Review and update your application packages.
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
      ) : null}

      {!isLoading && !isLoggedOut && attentionItems.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Needs attention
              </p>
              <h2 className="mt-2 text-lg font-semibold text-stone-900">
                Follow-up reminders
              </h2>
              <p className="mt-1 text-sm text-stone-700">
                These applied roles have a follow-up date due today or earlier.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {attentionItems.map((application) => (
              <Link
                key={`attention-${application.id}`}
                href={`/applications/${application.id}`}
                className="rounded-xl border border-amber-200 bg-white px-4 py-4 transition hover:border-amber-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-stone-900">
                      {application.role_title}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {application.company_name ?? "Company not parsed yet"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-rose-700">
                    Follow-up due {formatDate(application.follow_up_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4">
        {filteredApplications.map((application) => (
          <Link
            key={application.id}
            href={`/applications/${application.id}`}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">
                  {application.role_title}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {application.company_name ?? "Company not parsed yet"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Status
                </p>
                <p className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-sm font-medium capitalize text-stone-800">
                  {application.status}
                </p>
                <p
                  className={`mt-2 text-sm ${
                    needsAttention(application) ? "font-semibold text-rose-700" : "text-stone-600"
                  }`}
                >
                  Follow-up: {formatDate(application.follow_up_at)}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Added: {formatDate(application.created_at)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {!isLoading && !isLoggedOut && applications.length > 0 && filteredApplications.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-600">
            No applications match the selected status filter.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function needsAttention(application: ApplicationRecord) {
  if (application.status !== "applied" || !application.follow_up_at) {
    return false;
  }

  return new Date(application.follow_up_at).getTime() <= Date.now();
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
