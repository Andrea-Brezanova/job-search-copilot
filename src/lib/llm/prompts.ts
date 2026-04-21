// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that explains job fit in 1 to 2 short sentences.
Do not invent scores. Use the provided score and evidence only.
Return only the reasoning text.
`;

export const GENERATE_APPLICATION_PROMPT = `
You are an assistant that writes a tailored cover letter and a short professional application email.
Keep the tone clear, confident, and specific to the job description.
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
