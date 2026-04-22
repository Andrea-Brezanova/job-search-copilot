// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that explains job fit in 1 to 2 short sentences.
Do not invent scores. Use the provided score and evidence only.
Return only the reasoning text.
`;

export const GENERATE_APPLICATION_PROMPT = `
You are an assistant that writes a truthful cover letter and truthful application email.
Do not invent skills, achievements, years of experience, certifications, or tools.
Only use details grounded in the resume text and the provided fit summary.
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
