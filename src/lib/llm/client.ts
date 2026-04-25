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

const OPENAI_TIMEOUT_MS = 15000;

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
    const response = await Promise.race([
      client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5",
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
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`OpenAI request timed out after ${OPENAI_TIMEOUT_MS}ms`));
        }, OPENAI_TIMEOUT_MS);
      })
    ]);

    const outputText = response.output_text?.trim();

    if (!outputText) {
      return null;
    }

    if (outputType === "json") {
      return JSON.parse(outputText) as T;
    }

    return outputText as T;
  } catch (error) {
    console.error("OpenAI generation failed", error);
    return null;
  }
}
