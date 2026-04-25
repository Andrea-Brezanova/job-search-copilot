// This file stores prompt templates for future real LLM integrations.
export const ANALYZE_JOB_PROMPT = `
You are an assistant that explains job fit in 1 to 2 short sentences.
Do not invent scores. Use the provided score and evidence only.
Return only the reasoning text.
`;

export const GENERATE_APPLICATION_PROMPT = `
Write a short, natural cover letter and email for a junior software developer.

Return JSON:
{
  "cover_letter": "",
  "email_text": "",
  "application_summary": ""
}

Use ONLY the structured CoverLetterInput provided.

STYLE:
- human
- simple
- concise
- not corporate
- not keyword-heavy

RULES:
- Do NOT copy sentences from the job description
- Do NOT invent experience, metrics, ownership, or scale
- Do NOT write a separate skills paragraph
- Skills should appear naturally inside the experience paragraphs only
- Use the exact role
- Use a simple, human opening and do NOT list raw responsibilities
- Always include the primary story as a full paragraph
- Include the secondary story if it is present
- Ensure every sentence has a subject
- In experience paragraphs, always write in the first person
- Keep the cover letter 160–220 words

STRUCTURE:
1. Greeting
2. Opening:
"I’m applying for the [role] role because it aligns with the kind of work I want to build on, especially developing backend tools and working with database-driven systems."
3. Primary story paragraph:
- 3 to 4 sentences
- start with "During my internship at [organization], I..."
- explain what was built
- mention Django naturally if it appears in the primary story
- explain what problem it solved and why it mattered
4. Secondary story paragraph if available:
- start with "Earlier, as [role] at [organization], I..."
- focus on SQL, debugging, collaboration, data validation, communication, or problem-solving when supported
5. Closing with this exact sentence:
"I’d be happy to discuss the role in more detail or walk you through my Django project over a short Zoom call."
6. Signature:
Best regards,
[Name]
[Email]

EMAIL:
- 70–100 words
- simple and natural
- use this structure:
  1. greeting
  2. "I’m applying for the [Role] role."
  3. "I’ve attached my cover letter and resume for your consideration."
  4. "Would you be available for a short Zoom call this week to discuss the role?"
  5. "I’d be happy to walk you through my project and learn more about your team."
  5. signature once only
- do not copy full sentences from the cover letter
- do not include a project or experience sentence in the email body
- do not include a skills list
- do not reuse the cover letter CTA
- do not use vague phrasing like "talk through the role" or "I’d be happy to connect"

APPLICATION SUMMARY:
- 1 to 2 short sentences
- summarize the strongest fit honestly

INPUT:
CoverLetterInput:
{{coverLetterInput}}
`;

export const PARSE_PROFILE_PROMPT = `
You are an assistant that extracts a clean summary, skills, experience level, and target roles from profile text.
Return structured JSON only.
`;
