import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-faint)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-display text-4xl italic leading-none tracking-[-0.03em] text-[var(--color-navy)] sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl font-doc text-lg leading-8 text-[var(--color-ink-soft)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
