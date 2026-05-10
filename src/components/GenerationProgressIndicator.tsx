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
    <p className="mt-3 text-center text-sm text-stone-600">
      {stageText}
    </p>
  );
}
