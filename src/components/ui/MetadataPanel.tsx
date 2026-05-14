import type { ReactNode } from "react";

type MetadataPanelProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function MetadataPanel({
  title,
  description,
  eyebrow,
  actions,
  children,
  className = "",
}: MetadataPanelProps) {
  return (
    <section className={`surface-panel p-6 ${className}`.trim()}>
      <div className="flex flex-col gap-4 border-b border-[var(--color-line)] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-[var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
