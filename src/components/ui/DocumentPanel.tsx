import type { ReactNode } from "react";

type DocumentPanelProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DocumentPanel({
  title,
  description,
  eyebrow,
  actions,
  children,
  className = "",
}: DocumentPanelProps) {
  return (
    <section className={`surface-paper p-6 md:p-7 ${className}`.trim()}>
      <div className="flex flex-col gap-4 border-b border-[var(--color-line)] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 font-display text-2xl italic leading-none text-[var(--color-navy)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
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
