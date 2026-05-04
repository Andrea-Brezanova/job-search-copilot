"use client";

// This file lists saved applications from Supabase.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ApplicationRecord } from "@/lib/types";

export default function ApplicationsPage() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);

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

      <section className="mt-6 grid gap-4">
        {applications.map((application) => (
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
                <p className="mt-2 text-sm text-stone-600">
                  Fit score: {application.fit_score ?? "N/A"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
