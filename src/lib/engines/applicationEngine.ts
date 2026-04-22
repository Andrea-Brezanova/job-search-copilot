// This file generates the application package used by the workspace.
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import type { ApplicationDocs, ApplicationPackage } from "@/lib/types";
import { analyzeJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";

export async function generateApplicationDocs(
  profileText: string,
  jobDescription: string
): Promise<ApplicationDocs> {
  const applicationPackage = await generateApplicationPackage(
    profileText,
    jobDescription
  );

  return applicationPackage.documents;
}

export async function generateApplicationPackage(
  profileText: string,
  jobDescription: string
): Promise<ApplicationPackage> {
  const [profile, job, fit] = await Promise.all([
    parseProfileText(profileText),
    Promise.resolve(parseJobText(jobDescription)),
    analyzeJobFit(profileText, jobDescription)
  ]);

  const llmResult = await generateStructuredOutput<ApplicationDocs>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: [
      "Write a truthful cover letter and truthful application email.",
      "Only use information supported by the resume text.",
      `PROFILE:\n${profileText}`,
      `JOB:\n${jobDescription}`,
      `FIT SUMMARY:\n${fit.reasoning}`
    ].join("\n\n")
  });

  const roleName = job.title;
  const topSkills = profile.skills.slice(0, 3);
  const skillSummary =
    topSkills.length > 0 ? topSkills.join(", ") : "experience described in my resume";
  const companyReference = job.company ? ` at ${job.company}` : "";
  const documents =
    llmResult ??
    buildFallbackApplicationDocs({
      roleName,
      companyReference,
      skillSummary,
      fitReasoning: fit.reasoning
    });

  return {
    documents,
    fitAnalysis: fit,
    parsedJob: job
  };
}

function buildFallbackApplicationDocs(input: {
  roleName: string;
  companyReference: string;
  skillSummary: string;
  fitReasoning: string;
}): ApplicationDocs {
  return {
    coverLetter: `Dear Hiring Team,

I am applying for the ${input.roleName} role${input.companyReference}. My resume highlights experience with ${input.skillSummary}, which appears relevant to the responsibilities in the job description.

From my review of the role, I believe I can contribute where my background overlaps with the team's needs while continuing to grow in areas that are new to me. ${input.fitReasoning}

Thank you for your time and consideration. I would welcome the opportunity to speak with you further.

Sincerely,
[Your Name]`,
    applicationEmail: `Subject: Application for ${input.roleName}

Hello,

I’m sharing my application for the ${input.roleName} role. Based on my resume, I have experience with ${input.skillSummary}, and I’ve attached a tailored cover letter for context.

Thank you for your time. I would be glad to discuss my background further.

Best,
[Your Name]`
  };
}
