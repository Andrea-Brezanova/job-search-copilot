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
"I’m applying for the [role] because it aligns with the kind of work I want to build on, especially developing backend tools and working with database-driven systems."
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
"I’d be happy to talk through the role in more detail or walk through my Django project over a short Zoom call."
6. Signature:
Best regards,
[Name]
[Email]

EMAIL:
- 70–110 words
- simple and natural
- mention role and strongest fit
- include the same Zoom CTA
- signature once only

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
