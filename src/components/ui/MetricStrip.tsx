type MetricStripItem = {
  label: string;
  value: string | number;
  tone?: "default" | "alert";
};

type MetricStripProps = {
  items: MetricStripItem[];
  columnsClassName?: string;
};

export function MetricStrip({
  items,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-5",
}: MetricStripProps) {
  return (
    <section className={`grid gap-3 ${columnsClassName}`.trim()}>
      {items.map((item) => (
        <article
          key={item.label}
          className={`rounded-xl border px-4 py-4 ${
            item.tone === "alert"
              ? "border-[#e5d1ac] bg-[var(--color-warn-soft)]"
              : "border-[var(--color-line)] bg-[var(--color-paper)]"
          }`}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
            {item.label}
          </p>
          <p
            className={`mt-3 text-3xl font-semibold tracking-[-0.03em] ${
              item.tone === "alert"
                ? "text-[var(--color-ochre)]"
                : "text-[var(--color-ink)]"
            }`}
          >
            {item.value}
          </p>
        </article>
      ))}
    </section>
  );
}
