// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that explains job fit in 1 to 2 short sentences.
Do not invent scores. Use the provided score and evidence only.
Return only the reasoning text.
`;

export const GENERATE_APPLICATION_PROMPT = `
Write a simple, human application package for an early-career software developer.

Return valid JSON only in exactly this shape:
{
  "cover_letter": "",
  "email_text": "",
  "application_summary": ""
}

Use only the structured context provided by the app.
Do not guess the company or role from noisy job-board text.

Cover letter requirements:
- Use this structure: greeting, why applying, relevant experience, skills plus 1–2 growth areas, Zoom CTA
- Keep the cover letter between 160 and 230 words
- If company is available, begin with "Dear [Company] Hiring Team,"
- If company is empty, begin with "Dear Hiring Team,"
- Opening should prefer:
  "I’m applying for the [Role] at [Company] because it matches the kind of work I want to keep building on: [relevant job description details]..."
- If company is empty, omit "at [Company]"
- Always use the exact role string provided by the app. Do not shorten or generalize it.
- Do not start with "I’m excited to apply"
- Keep the opening line simple, natural, and human.
- Prefer phrasing like "Python web applications" instead of "Python-based web applications".
- Prefer phrasing like "strong data models" instead of "solid data models".
- Closing must include:
  "I’d be happy to talk through the role in more detail or walk through my Django project over a short Zoom call."
- Do not ask for a generic call or imply phone availability.
- You may include email naturally, but do not emphasize phone contact.
- Use plain language
- Keep the cover letter concise and grounded

Email requirements:
- Keep it short and professional
- Keep the email between 70 and 110 words
- Mention the role
- Mention 1–2 relevant strengths from the resume
- Mention Zoom in the closing sentence

Application summary requirements:
- 1–2 short sentences
- Explain why the candidate is a credible fit using only supported facts

Rules:
- Do not invent experience
- Do not exaggerate
- Do not mention company mission, culture, promises, or business priorities
- Do not use corporate language
- Do not dump keywords
- Use at most 1–2 growth areas
- Use the supported resume skills and resume evidence provided by the app
- If a technology appears only in the job description, phrase it as a learning goal
- Do not include job-board metadata such as location, reposted, applicants, promoted, remote, or full-time labels
- Keep the letter readable and grounded
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
