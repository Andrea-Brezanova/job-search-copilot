type GenerationProgressIndicatorProps = {
  isGenerating: boolean;
  stageText: string;
};

export function GenerationProgressIndicator({
  isGenerating,
  stageText,
}: GenerationProgressIndicatorProps) {
  if (!isGenerating) {
    return null;
  }

  return (
    <p className="mt-3 font-mono text-center text-[11px] uppercase tracking-[0.14em] text-[var(--color-faint)]">
      {stageText}
    </p>
  );
}
