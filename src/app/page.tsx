// This file renders the auth landing page or the workspace for signed-in users.
"use client";

import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/ui/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Workspace } from "@/components/Workspace";

export default function HomePage() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <AppShell contentClassName="flex items-center justify-center py-24">
        <div className="surface-panel flex w-full max-w-xl items-center justify-center px-6 py-16">
          <p className="text-sm text-[var(--color-muted)]">Checking session...</p>
        </div>
      </AppShell>
    );
  }

  if (user) {
    return <Workspace />;
  }

  return (
    <AppShell width="wide" contentClassName="grid min-h-[calc(100vh-120px)] gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
      <section className="pt-4 lg:pt-8">
        <StatusPill label="Document workflow for job search" tone="default" />
        <PageHeader
          eyebrow="Cover letters, outreach, follow-ups"
          title="One place for every cover letter, email, and reply."
          description="Generate a tailored application package from any job description, then keep every draft, follow-up, and status update in a calm workspace built around the documents themselves."
        />

        <div className="mt-8 grid gap-4 border-t border-[var(--color-line)] pt-6 sm:grid-cols-3">
          <LandingFact
            title="Generate"
            body="Create a cover letter and application email from your resume and one job post."
          />
          <LandingFact
            title="Review"
            body="Edit the documents directly, export them, and open Gmail drafts when you are ready."
          />
          <LandingFact
            title="Track"
            body="Save applications, update statuses, and keep follow-up notes in the same workflow."
          />
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="surface-paper p-6">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
                Cover letter
              </p>
              <StatusPill label="Applied" tone="applied" compact />
            </div>
            <div className="mt-5 font-doc text-[17px] leading-8 text-[var(--color-ink-soft)]">
              <p className="font-display text-3xl italic leading-none text-[var(--color-navy)]">
                Hiring Team,
              </p>
              <p className="mt-5">
                I’m applying to bring strong writing, careful research, and process
                rigor to a thoughtful product team. The document itself stays at the
                center, while the workflow around it stays calm and operational.
              </p>
              <p className="mt-4 text-[var(--color-muted)]">
                Drafts remain editable, exportable, and easy to track across the
                application lifecycle.
              </p>
            </div>
          </article>

          <aside className="surface-panel p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
              Open your workspace
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
              Sign in or create an account
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Save your default resume, keep each generated draft, and return to
              your application pipeline anytime.
            </p>
            <div className="mt-6">
              <AuthPanel variant="card" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className={buttonStyles({ variant: "ghost", size: "sm" })}>
                Export PDF / DOCX
              </span>
              <span className={buttonStyles({ variant: "ghost", size: "sm" })}>
                Gmail compose links
              </span>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

function LandingFact({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <article className="surface-warm px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-faint)]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">{body}</p>
    </article>
  );
}
