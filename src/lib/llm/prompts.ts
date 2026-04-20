// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that compares a candidate profile to a job description.
Return structured JSON with fitScore, strengths, gaps, recommendation, and reasoning.
`;

export const GENERATE_APPLICATION_PROMPT = `
You are an assistant that writes a tailored cover letter and a short professional application email.
Keep the tone clear, confident, and specific to the job description.
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
