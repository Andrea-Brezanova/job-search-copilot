// This file is the future integration point for real LLM provider calls.
type GenerateStructuredOutputParams = {
  prompt: string;
  input: string;
};

export async function generateStructuredOutput<T>({
  prompt,
  input
}: GenerateStructuredOutputParams): Promise<T | null> {
  void prompt;
  void input;

  // TODO: Replace this placeholder with a real OpenAI or other LLM SDK call.
  // Keep the return type generic so the engine layer can request typed objects.
  return null;
}
