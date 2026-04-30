// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that explains job fit in 1 to 2 short sentences.
Do not invent scores. Use the provided score and evidence only.
Return only the reasoning text.
`;

export const GENERATE_APPLICATION_PROMPT = `
Write a natural, professional cover letter and email for a job application.

Return JSON:
{
  "cover_letter": "",
  "email_text": "",
  "application_summary": ""
}

Use the resume and job description to create a coherent story.
Do not copy bullet points directly.
Do not output bullet points.
Write in complete sentences only.

Cover letter requirements:
- Start with: Dear [Company] Hiring Team, or Dear Hiring Team,
- Mention the exact role.
- Explain why the role fits the candidate’s direction.
- Select the strongest relevant experience from the resume.
- Select one supporting experience, certification, skill, or transferable background.
- Connect both to the job description in natural prose.
- If a job requirement is not clearly in the resume, phrase it as interest in learning or deepening.
- Do not invent experience.
- Do not use placeholders.
- Do not use section headings as a name.
- Keep it 180–260 words.
- End with a Zoom CTA.
- Signature must use full candidate name and email once.

Email requirements:
- Short, 70–110 words.
- Mention exact role.
- Mention strongest relevant proof.
- Ask a question about a Zoom call.
- Signature must use full candidate name and email once.

CTA:
"Would you be available for a short Zoom call this week to discuss the role?"

Input:
generationPayload:
{{generationPayload}}
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
