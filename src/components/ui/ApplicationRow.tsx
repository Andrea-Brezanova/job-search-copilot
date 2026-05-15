import Link from "next/link";
import type { ReactNode } from "react";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { buttonStyles } from "./buttonStyles";

type ApplicationRowProps = {
  application: ApplicationRecord;
  isOverdue?: boolean;
};

const statusRuleClasses: Record<ApplicationStatus, string> = {
  draft: "bg-[var(--color-line)]",
  applied: "bg-[var(--color-navy)]",
  interview: "bg-[var(--color-ok)]",
  offer: "bg-[var(--color-ok)]",
  rejected: "bg-[#9a4c39]",
  archived: "bg-[var(--color-faint)]",
};

export function ApplicationRow({
  application,
  isOverdue = false,
}: ApplicationRowProps) {
  return (
    <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-0 shadow-[0_1px_0_var(--color-hair)]">
      <div className="grid grid-cols-[4px_1fr]">
        <div
          className={`rounded-l-xl ${isOverdue ? "bg-[var(--color-ochre)]" : statusRuleClasses[application.status]}`}
        />
        <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)]">
                {application.role_title}
              </h3>
              {isOverdue ? (
                <StatusPill label="Follow-up due" tone="follow_up_due" compact />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {application.company_name ?? "Company not parsed yet"}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
              Added {formatDate(application.created_at)}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-[var(--color-muted)] sm:grid-cols-3 lg:min-w-[360px]">
            <Metadata label="Status">
              <StatusPill status={application.status} compact />
            </Metadata>
            <Metadata label="Applied">{formatDate(application.applied_at)}</Metadata>
            <Metadata label="Follow-up">
              <span className={isOverdue ? "font-semibold text-[var(--color-ochre)]" : ""}>
                {formatDate(application.follow_up_at)}
              </span>
            </Metadata>
          </div>

          <div className="lg:ml-2">
            <Link
              href={`/applications/${application.id}`}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Metadata({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
        {label}
      </p>
      <div className="mt-2 text-sm text-[var(--color-ink-soft)]">{children}</div>
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
