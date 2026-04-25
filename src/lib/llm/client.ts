// This file wraps the OpenAI Responses API for text and structured JSON output.
import OpenAI from "openai";

type GenerateStructuredOutputParams = {
  prompt: string;
  input: string;
  outputType?: "text" | "json";
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
};

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_OPENAI_TIMEOUT_MS = 12000;

export async function generateStructuredOutput<T>({
  prompt,
  input,
  outputType = "text",
  jsonSchema
}: GenerateStructuredOutputParams): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_OPENAI_TIMEOUT_MS);
    const startedAt = Date.now();
    console.log("openai-model", model);
    console.log("openai-timeout-ms", timeoutMs);

    const requestPromise = client.responses.create({
      model,
      instructions: prompt,
      input,
      text:
        outputType === "json" && jsonSchema
          ? {
              format: {
                type: "json_schema",
                name: jsonSchema.name,
                schema: jsonSchema.schema
              }
            }
          : {
              format: {
                type: "text"
              }
            }
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`OpenAI request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);
    console.log("openai-responses-create-ms", Date.now() - startedAt);

    const outputText = response.output_text?.trim();

    if (!outputText) {
      return null;
    }

    if (outputType === "json") {
      return JSON.parse(outputText) as T;
    }

    return outputText as T;
  } catch (error) {
    if (error instanceof Error && error.message.includes("timed out")) {
      console.warn("OpenAI generation timed out");
      return null;
    }

    console.error("OpenAI generation failed", error);
    return null;
  }
}
