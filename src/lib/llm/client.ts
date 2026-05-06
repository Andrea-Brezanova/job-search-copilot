// This file wraps the OpenAI Responses API for text and structured JSON output.
import OpenAI from "openai";
import { debugJson, debugLog } from "@/lib/logging";

type GenerateStructuredOutputParams = {
  prompt: string;
  input: string;
  outputType?: "text" | "json";
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
};

export type StructuredOutputDebug<T> = {
  data: T | null;
  model: string;
  rawOutputText: string;
  wasOpenAIUsed: boolean;
  error?: string;
};

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_OPENAI_TIMEOUT_MS = 30000;

export async function generateStructuredOutput<T>({
  prompt,
  input,
  outputType = "text"
}: GenerateStructuredOutputParams): Promise<StructuredOutputDebug<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return {
      data: null,
      model,
      rawOutputText: "",
      wasOpenAIUsed: false,
      error: "Missing OPENAI_API_KEY"
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_OPENAI_TIMEOUT_MS);
    const startedAt = Date.now();
    debugLog("openai-model", model);
    debugLog("openai-timeout-ms", timeoutMs);

    const requestPromise = client.responses.create({
      model,
      instructions: prompt,
      input,
      text: {
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
    debugLog("openai-responses-create-ms", Date.now() - startedAt);
    debugJson("OPENAI RAW RESPONSE:", response);

    const outputText = extractResponseText(response).trim();
    debugLog("EXTRACTED TEXT:", outputText);

    if (!outputText) {
      return {
        data: null,
        model,
        rawOutputText: "",
        wasOpenAIUsed: true,
        error: "OpenAI returned empty output_text"
      };
    }

    if (outputType === "json") {
      const parsedJson = parseJsonFromModelText<T>(outputText);
      return {
        data: parsedJson,
        model,
        rawOutputText: outputText,
        wasOpenAIUsed: true,
        error: parsedJson ? undefined : "Unable to parse model output as JSON"
      };
    }

    return {
      data: outputText as T,
      model,
      rawOutputText: outputText,
      wasOpenAIUsed: true
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("timed out")) {
      console.warn("OpenAI generation timed out");
      return {
        data: null,
        model,
        rawOutputText: "",
        wasOpenAIUsed: true,
        error: error.message
      };
    }

    console.error("OpenAI generation failed", error);
    return {
      data: null,
      model,
      rawOutputText: "",
      wasOpenAIUsed: true,
      error: error instanceof Error ? error.message : "Unknown OpenAI error"
    };
  }
}

function extractResponseText(response: unknown) {
  const fallbackText = (response as { output_text?: string } | null)?.output_text;
  if (fallbackText) {
    return fallbackText;
  }

  const output = (response as { output?: Array<unknown> } | null)?.output;
  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    const content = (item as { content?: Array<unknown> } | null)?.content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const text = (part as { text?: string } | null)?.text;
      if (typeof text === "string" && text.trim()) {
        return text;
      }
    }
  }

  return "";
}

function parseJsonFromModelText<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() ?? extractJSONObject(text);

    if (!candidate) {
      return null;
    }

    try {
      return JSON.parse(candidate) as T;
    } catch {
      return null;
    }
  }
}

function extractJSONObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return text.slice(start, end + 1);
}
