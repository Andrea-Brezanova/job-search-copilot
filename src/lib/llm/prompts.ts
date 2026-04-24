// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that explains job fit in 1 to 2 short sentences.
Do not invent scores. Use the provided score and evidence only.
Return only the reasoning text.
`;

export const GENERATE_APPLICATION_PROMPT = `
Write 3 short parts of a cover letter for a junior software developer.

Return JSON only:
{
  "openingLine": "",
  "skillsParagraph": "",
  "closing": ""
}

Instructions:

1. openingLine
Write ONE simple sentence:
"I’m applying for the [Role] because it matches the kind of work I want to build on: [1–2 tasks from the job description]."

2. skillsParagraph
Write ONE short paragraph (70–100 words):
- Mention skills from the resume (Python, Django, SQL, etc.)
- Mention at most 1–2 skills from the job description that are not in the resume as learning goals
- Keep it natural, no keyword lists
- Keep language simple and human

3. closing
Write 1–2 short sentences:
- Friendly and confident
- Suggest a short conversation or call

Rules:
- Do not invent experience
- Do not exaggerate
- Do not mention company mission or culture
- Do not use corporate language
- Do not list many technologies
- Keep everything simple and readable

Opening:
- Do not start with "I'm excited to apply".
- Prefer:
  "I’m applying for the [Role] at [Company] because it aligns with the kind of backend/software work I want to keep building on."

Closing:
- Do not say "phone call" or just "call".
- Mention Zoom specifically.
- Prefer:
  "I’d be happy to talk through the role or walk through my Django project in more detail over a short Zoom call."

Role: {{role}}
Company: {{company}}
Job description: {{jobDescription}}
Resume: {{resumeText}}
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
