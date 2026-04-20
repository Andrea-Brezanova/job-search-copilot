// This file generates cover letter and email drafts from the profile and job text.
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import type { ApplicationDocs } from "@/lib/types";
import { analyzeJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";

export async function generateApplicationDocs(
  profileText: string,
  jobDescription: string
): Promise<ApplicationDocs> {
  const llmResult = await generateStructuredOutput<ApplicationDocs>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: `PROFILE:\n${profileText}\n\nJOB:\n${jobDescription}`
  });

  if (llmResult) {
    return llmResult;
  }

  const [profile, job, fit] = await Promise.all([
    parseProfileText(profileText),
    Promise.resolve(parseJobText(jobDescription)),
    analyzeJobFit(profileText, jobDescription)
  ]);

  const roleName = job.title;
  const topSkill = profile.skills[0] ?? "relevant experience";

  return {
    coverLetter: `Dear Hiring Team,

I am excited to apply for the ${roleName} role. My background includes ${profile.experienceLevel.toLowerCase()} experience across ${profile.skills.join(", ")}, and I am especially confident in bringing ${topSkill} to this opportunity.

Based on the job description, I believe my strengths align well with the team's needs. In particular, I can contribute with practical execution, clear communication, and a thoughtful approach to delivering high-quality work. I am also motivated by the chance to grow in the areas the role emphasizes most.

Your posting stood out because it combines strong execution with meaningful impact. I would welcome the opportunity to contribute and learn more about your team's goals.

Thank you for your time and consideration.

Sincerely,
[Your Name]`,
    applicationEmail: `Subject: Application for ${roleName}

Hello,

I’m reaching out to share my application for the ${roleName} role. My background aligns with several of the priorities in the job description, and my current fit assessment is ${fit.fitScore}/100 with a ${fit.recommendation.toLowerCase()} recommendation.

I’ve included a tailored cover letter and would be glad to discuss how my experience with ${profile.skills.slice(0, 3).join(", ")} can support your team.

Thank you for your time.

Best,
[Your Name]`
  };
}
