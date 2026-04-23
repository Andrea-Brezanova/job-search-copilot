// This file generates the application package used by the workspace.
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import type {
  ApplicationDocs,
  ApplicationPackage,
  ApplicationTailoringContext,
  FitAnalysis,
  ParsedJob,
  ParsedProfile,
  RequirementMatch
} from "@/lib/types";
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
  const tailoringContext = buildApplicationTailoringContext(profile, job, fit);

  const llmResult = await generateStructuredOutput<ApplicationDocs>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: [
      `ROLE TITLE: ${tailoringContext.roleTitle}`,
      `COMPANY: ${tailoringContext.companyName ?? "Not specified"}`,
      `TOP REQUIREMENTS: ${tailoringContext.topRequirements.join(", ")}`,
      `MATCHED REQUIREMENTS: ${formatRequirementMatches(
        tailoringContext.matchedRequirements
      )}`,
      `MISSING REQUIREMENTS: ${tailoringContext.missingRequirements.join(", ") || "None identified"}`,
      `RESUME HIGHLIGHTS: ${tailoringContext.resumeHighlights.join(" | ")}`,
      `FIT SUMMARY: ${tailoringContext.fitReasoning}`,
      `RAW PROFILE: ${profileText}`,
      `RAW JOB DESCRIPTION: ${jobDescription}`
    ].join("\n\n")
  });

  const documents =
    llmResult ??
    buildFallbackApplicationDocs(tailoringContext);

  return {
    documents,
    fitAnalysis: fit,
    parsedJob: job
  };
}

function buildApplicationTailoringContext(
  profile: ParsedProfile,
  job: ParsedJob,
  fit: FitAnalysis
): ApplicationTailoringContext {
  const topRequirements = job.requirements.slice(0, 3);
  const matchedRequirements = buildRequirementMatches(profile, topRequirements);
  const missingRequirements = topRequirements.filter(
    (requirement) =>
      !matchedRequirements.some((match) => match.requirement === requirement)
  );

  return {
    roleTitle: job.title,
    companyName: job.company,
    topRequirements,
    matchedRequirements,
    missingRequirements,
    resumeHighlights: profile.highlights.slice(0, 3),
    fitReasoning: fit.reasoning
  };
}

function buildRequirementMatches(
  profile: ParsedProfile,
  topRequirements: string[]
) {
  const normalizedSkills = profile.skills.map((skill) => skill.toLowerCase());
  const normalizedHighlights = profile.highlights.map((highlight) => highlight.toLowerCase());

  return topRequirements.reduce<RequirementMatch[]>((matches, requirement) => {
    const requirementTokens = requirement
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);
    const matchedSkills = normalizedSkills.filter(
      (skill) =>
        requirement.includes(skill) ||
        requirementTokens.some((token) => skill.includes(token) || token.includes(skill))
    );
    const evidence = profile.highlights.filter((highlight, index) =>
      requirementTokens.some((token) => normalizedHighlights[index].includes(token))
    );

    if (matchedSkills.length === 0 && evidence.length === 0) {
      return matches;
    }

    matches.push({
      requirement,
      matchedSkills,
      evidence: evidence.slice(0, 2)
    });

    return matches;
  }, []);
}

function buildFallbackApplicationDocs(
  tailoringContext: ApplicationTailoringContext
): ApplicationDocs {
  const companyReference = tailoringContext.companyName
    ? ` at ${tailoringContext.companyName}`
    : "";
  const strongestMatches =
    tailoringContext.matchedRequirements.length > 0
      ? tailoringContext.matchedRequirements
          .slice(0, 2)
          .map((match) => {
            const evidenceText =
              match.evidence[0] ??
              `My resume includes relevant experience connected to ${match.matchedSkills.join(
                ", "
              )}.`;

            return `The role emphasizes ${match.requirement}, and my resume supports that with ${evidenceText}`;
          })
          .join(" ")
      : "My resume shows related experience that overlaps with the role's priorities.";
  const growthStatement =
    tailoringContext.missingRequirements.length > 0
      ? `I would also be thoughtful about growing into areas such as ${tailoringContext.missingRequirements.join(
          ", "
        )} where the job description places added emphasis.`
      : "My background appears to align well with the key priorities in the job description.";

  return {
    coverLetter: `Dear Hiring Team,

I am applying for the ${tailoringContext.roleTitle} role${companyReference}. After reviewing the job description, I believe my background aligns most closely where the role requires ${tailoringContext.topRequirements.join(
      ", "
    )}.

${strongestMatches}

${growthStatement} ${tailoringContext.fitReasoning}

Thank you for your time and consideration. I would welcome the opportunity to speak with you further.

Sincerely,
[Your Name]`,
    applicationEmail: `Subject: Application for ${tailoringContext.roleTitle}

Hello,

I’m sharing my application for the ${tailoringContext.roleTitle} role. Based on my resume, my background appears to align most directly with ${tailoringContext.topRequirements.join(
      ", "
    )}, and I’ve attached a tailored cover letter for context.

Thank you for your time. I would be glad to discuss my background further.

Best,
[Your Name]`
  };
}

function formatRequirementMatches(matches: RequirementMatch[]) {
  if (matches.length === 0) {
    return "No clear requirement matches were identified.";
  }

  return matches
    .map((match) => {
      const skills = match.matchedSkills.join(", ") || "general related experience";
      const evidence = match.evidence.join(" | ") || "No specific evidence line available.";
      return `${match.requirement} => skills: ${skills}; evidence: ${evidence}`;
    })
    .join("\n");
}
