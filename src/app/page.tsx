// This file renders the auth landing page or the workspace for signed-in users.
"use client";

import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { Workspace } from "@/components/Workspace";

export default function HomePage() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,107,82,0.14),_transparent_35%),linear-gradient(to_bottom,_#f7f6f3,_#f5f5f4)]">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-24">
          <p className="text-sm text-stone-600">Checking session...</p>
        </div>
      </main>
    );
  }

  if (user) {
    return <Workspace />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,107,82,0.14),_transparent_35%),linear-gradient(to_bottom,_#f7f6f3,_#f5f5f4)]">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
            YOUR JOB SEARCH MADE EASY
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Application Package Generator
          </h1>
          <div className="mt-6 space-y-4 text-base leading-7 text-stone-600">
            <p>Create a tailored cover letter and email for each job application.</p>
            <p>Save all your applications in one place.</p>
            <p>Track your job search progress.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-stone-900">Sign in or create an account</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Sign in to open your workspace and manage saved applications.
            </p>
          </div>
          <AuthPanel variant="card" />
        </section>
      </div>
    </main>
  );
}
