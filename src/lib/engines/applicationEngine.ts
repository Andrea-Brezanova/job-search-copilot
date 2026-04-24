// This file generates the application package used by the workspace.
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import { generatedApplicationContentJsonSchema } from "@/lib/llm/schemas";
import type {
  ApplicationDocs,
  ApplicationPackage,
  ApplicationQualityNotes,
  ApplicationTailoringContext,
  FitAnalysis,
  GeneratedApplicationContent,
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

  const generationInput = buildGenerationInput(
    tailoringContext,
    profileText,
    jobDescription
  );

  const llmResult = await generateStructuredOutput<GeneratedApplicationContent>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: generationInput,
    outputType: "json",
    jsonSchema: generatedApplicationContentJsonSchema
  });

  const generatedContent = await finalizeGeneratedApplicationContent(
    llmResult,
    tailoringContext,
    generationInput,
    profileText,
    jobDescription
  );

  return {
    documents: {
      coverLetter: generatedContent.coverLetter,
      applicationEmail: generatedContent.applicationEmail
    },
    fitAnalysis: fit,
    parsedJob: job,
    applicationSummary: generatedContent.applicationSummary,
    qualityNotes: generatedContent.qualityNotes
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
  const greeting = tailoringContext.companyName
    ? `Dear ${tailoringContext.companyName} Hiring Team,`
    : "Dear Hiring Team,";
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
              `resume experience connected to ${match.matchedSkills.join(", ")}.`;

            return `My background includes work connected to ${match.requirement}, including ${evidenceText}`;
          })
          .join(" ")
      : "My background includes relevant experience that overlaps with the role's priorities.";
  const growthStatement =
    tailoringContext.missingRequirements.length > 0
      ? `I would be glad to continue growing in areas such as ${tailoringContext.missingRequirements.join(
          ", "
        )} as I build on my current foundation.`
      : "My background appears to align well with the key priorities for the role.";

  return {
    coverLetter: `${greeting}

The ${tailoringContext.roleTitle} role${companyReference} matches the kind of work I want to keep building on: practical Python development, database-backed applications, and software that improves real workflows.

${strongestMatches}

That combination of hands-on development work, SQL and relational database experience, and cross-functional collaboration is what I would bring to this role. ${growthStatement} ${tailoringContext.fitReasoning}

Thank you for your time and consideration. I would welcome the opportunity to speak with you further.

Sincerely,
[Your Name]`,
    applicationEmail: `Subject: Application for ${tailoringContext.roleTitle}

Hello${tailoringContext.companyName ? ` ${tailoringContext.companyName} Hiring Team` : ""},

I’m sharing my application for the ${tailoringContext.roleTitle} role. My background includes experience related to ${tailoringContext.topRequirements.join(
      ", "
    )}, and I’ve attached a tailored cover letter for context.

Thank you for your time. I would be glad to discuss my background further.

Best,
[Your Name]`
  };
}

function buildFallbackGeneratedContent(
  tailoringContext: ApplicationTailoringContext
): GeneratedApplicationContent {
  const fallbackDocs = buildFallbackApplicationDocs(tailoringContext);

  return {
    coverLetter: fallbackDocs.coverLetter,
    applicationEmail: fallbackDocs.applicationEmail,
    applicationSummary: tailoringContext.fitReasoning,
    qualityNotes: {
      factsUsedFromResume: tailoringContext.resumeHighlights.slice(0, 3),
      jobRequirementsAddressed: tailoringContext.topRequirements.slice(0, 3),
      growthAreasPhrasedCarefully: tailoringContext.missingRequirements.slice(0, 3)
    }
  };
}

function buildGenerationInput(
  tailoringContext: ApplicationTailoringContext,
  profileText: string,
  jobDescription: string
) {
  return [
    `ROLE TITLE: ${tailoringContext.roleTitle}`,
    `COMPANY: ${tailoringContext.companyName ?? "Not specified"}`,
    `TOP REQUIREMENTS: ${tailoringContext.topRequirements.join(", ")}`,
    `MATCHED REQUIREMENTS: ${formatRequirementMatches(
      tailoringContext.matchedRequirements
    )}`,
    `MISSING REQUIREMENTS: ${
      tailoringContext.missingRequirements.join(", ") || "None identified"
    }`,
    `RESUME HIGHLIGHTS: ${tailoringContext.resumeHighlights.join(" | ")}`,
    `FIT SUMMARY: ${tailoringContext.fitReasoning}`,
    `RAW PROFILE: ${profileText}`,
    `RAW JOB DESCRIPTION: ${jobDescription}`
  ].join("\n\n");
}

async function finalizeGeneratedApplicationContent(
  initialContent: GeneratedApplicationContent | null,
  tailoringContext: ApplicationTailoringContext,
  generationInput: string,
  profileText: string,
  jobDescription: string
) {
  if (!initialContent) {
    return buildFallbackGeneratedContent(tailoringContext);
  }

  const initialReview = reviewGeneratedApplicationDocs(
    initialContent,
    tailoringContext,
    profileText,
    jobDescription
  );

  if (initialReview.passed) {
    return initialContent;
  }

  const revisedContent = await reviseGeneratedApplicationDocs(
    initialContent,
    initialReview.issues,
    generationInput
  );

  if (!revisedContent) {
    return initialContent;
  }

  const revisedReview = reviewGeneratedApplicationDocs(
    revisedContent,
    tailoringContext,
    profileText,
    jobDescription
  );

  if (revisedReview.passed || revisedReview.issues.length < initialReview.issues.length) {
    return revisedContent;
  }

  return initialContent;
}

function reviewGeneratedApplicationDocs(
  content: GeneratedApplicationContent,
  tailoringContext: ApplicationTailoringContext,
  profileText: string,
  jobDescription: string
) {
  const issues: string[] = [];
  const coverLetterWordCount = countWords(content.coverLetter);
  const emailWordCount = countWords(content.applicationEmail);
  const flaggedPhrases = findFlaggedPhrases(content.coverLetter, content.applicationEmail);

  if (coverLetterWordCount < 250 || coverLetterWordCount > 350) {
    issues.push(
      `Keep the cover letter between 250 and 350 words. Current count: ${coverLetterWordCount}.`
    );
  }

  if (emailWordCount < 100 || emailWordCount > 150) {
    issues.push(
      `Keep the email between 100 and 150 words. Current count: ${emailWordCount}.`
    );
  }

  if (flaggedPhrases.length > 0) {
    issues.push(
      `Remove robotic or overly polished phrases such as: ${flaggedPhrases.join(", ")}.`
    );
  }

  if (containsInventedCompanyClaims(content.coverLetter, jobDescription)) {
    issues.push("Remove company claims that are not explicitly grounded in the job description.");
  }

  if (soundsExaggerated(content.coverLetter, content.applicationEmail)) {
    issues.push("Tone down claims that exaggerate the candidate's experience or responsibility.");
  }

  if (containsGeneralizedOwnershipClaims(content.coverLetter, content.applicationEmail)) {
    issues.push("Remove generalized ownership claims that are not explicitly supported by the resume.");
  }

  if (containsPresentTenseOverstatement(content.coverLetter, content.applicationEmail)) {
    issues.push("Avoid present-tense phrasing that overstates the candidate's current depth of experience.");
  }

  if (!hasValidHiringTeamGreeting(content.coverLetter, tailoringContext.companyName)) {
    issues.push(
      tailoringContext.companyName
        ? `Begin the cover letter with "Dear ${tailoringContext.companyName} Hiring Team,".`
        : 'Begin the cover letter with "Dear Hiring Team,".'
    );
  }

  if (!usesEnoughResumeEvidence(content.coverLetter, tailoringContext.resumeHighlights)) {
    issues.push("Use at least 2 concrete resume examples in the cover letter.");
  }

  if (!connectsToJobRequirements(content.coverLetter, tailoringContext.topRequirements)) {
    issues.push("Connect the resume more clearly to the top job requirements.");
  }

  if (hasDenseSentences(content.coverLetter) || hasDenseSentences(content.applicationEmail)) {
    issues.push("Shorten dense sentences for readability and a more natural junior-developer tone.");
  }

  if (closingMirrorsJobDescription(content.coverLetter, jobDescription)) {
    issues.push("Rewrite the closing so it sounds personal and does not mirror the job description too closely.");
  }

  if (hasTooManyFirstPersonSentenceStarts(content.coverLetter)) {
    issues.push('Reduce repeated sentence openings that begin with "I" to improve flow.');
  }

  if (openingFeelsAwkward(content.coverLetter, tailoringContext.companyName)) {
    issues.push("Rewrite the opening so it sounds more direct, practical, and grounded.");
  }

  if (
    !qualityNotesLookReasonable(
      content.qualityNotes,
      tailoringContext,
      profileText
    )
  ) {
    issues.push("Align the quality notes more closely with real resume facts and job requirements.");
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function reviseGeneratedApplicationDocs(
  content: GeneratedApplicationContent,
  issues: string[],
  generationInput: string
) {
  return generateStructuredOutput<GeneratedApplicationContent>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: [
      generationInput,
      "REVISION TASK:",
      "Revise the draft below to fix the listed issues only.",
      `ISSUES TO FIX: ${issues.join(" | ")}`,
      `CURRENT COVER LETTER: ${content.coverLetter}`,
      `CURRENT EMAIL: ${content.applicationEmail}`,
      `CURRENT SUMMARY: ${content.applicationSummary}`,
      `CURRENT QUALITY NOTES: ${JSON.stringify(content.qualityNotes)}`
    ].join("\n\n"),
    outputType: "json",
    jsonSchema: generatedApplicationContentJsonSchema
  });
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

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function findFlaggedPhrases(...texts: string[]) {
  const combinedText = texts.join(" ").toLowerCase();
  const flaggedPhrases = [
    "the role emphasizes",
    "i am excited to apply",
    "high-volume decisions",
    "product awareness",
    "company promise",
    "services roadmap",
    "qa-informed rigor to reliability",
    "end-to-end",
    "ship fast"
  ];

  return flaggedPhrases.filter((phrase) => combinedText.includes(phrase));
}

function containsInventedCompanyClaims(text: string, jobDescription: string) {
  const normalizedText = text.toLowerCase();
  const normalizedJobDescription = jobDescription.toLowerCase();
  const riskyCompanyClaims = ["mission", "promise", "culture", "roadmap", "future of work"];

  return riskyCompanyClaims.some(
    (claim) =>
      normalizedText.includes(claim) && !normalizedJobDescription.includes(claim)
  );
}

function soundsExaggerated(...texts: string[]) {
  const combinedText = texts.join(" ").toLowerCase();
  const exaggeratedPhrases = [
    "owned end-to-end",
    "production-scale",
    "ship reliably",
    "leadership",
    "strategic impact"
  ];

  return exaggeratedPhrases.some((phrase) => combinedText.includes(phrase));
}

function containsGeneralizedOwnershipClaims(...texts: string[]) {
  const combinedText = texts.join(" ").toLowerCase();
  const ownershipPhrases = [
    "from requirements to a working feature",
    "from requirements through production",
    "end-to-end",
    "owned",
    "took ownership of",
    "drove delivery",
    "adopted in daily work",
    "seeing changes through to deployment",
    "work independently on scoped tasks",
    "delivered a tool"
  ];

  return ownershipPhrases.some((phrase) => combinedText.includes(phrase));
}

function containsPresentTenseOverstatement(...texts: string[]) {
  const combinedText = texts.join(" ").toLowerCase();
  const presentTensePhrases = [
    "i work daily with",
    "i regularly build",
    "i specialize in",
    "i lead",
    "i ship reliably",
    "i bring a rigor"
  ];

  return presentTensePhrases.some((phrase) => combinedText.includes(phrase));
}

function usesEnoughResumeEvidence(
  coverLetter: string,
  resumeHighlights: string[]
) {
  const normalizedCoverLetter = coverLetter.toLowerCase();
  let evidenceMatches = 0;

  for (const highlight of resumeHighlights) {
    const significantTokens = highlight
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 5);

    if (significantTokens.some((token) => normalizedCoverLetter.includes(token))) {
      evidenceMatches += 1;
    }
  }

  return evidenceMatches >= 2 || resumeHighlights.length < 2;
}

function connectsToJobRequirements(
  coverLetter: string,
  requirements: string[]
) {
  const normalizedCoverLetter = coverLetter.toLowerCase();
  const addressedRequirements = requirements.filter((requirement) => {
    const tokens = requirement
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 3);

    return tokens.some((token) => normalizedCoverLetter.includes(token));
  });

  return addressedRequirements.length >= Math.min(2, requirements.length);
}

function hasDenseSentences(text: string) {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.some((sentence) => countWords(sentence) > 32);
}

function hasValidHiringTeamGreeting(text: string, companyName?: string) {
  const firstLine = text.trim().split("\n")[0]?.trim() ?? "";

  if (companyName) {
    return (
      firstLine === `Dear ${companyName} Hiring Team,` ||
      firstLine === "Dear Hiring Team,"
    );
  }

  return firstLine === "Dear Hiring Team,";
}

function hasTooManyFirstPersonSentenceStarts(text: string) {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const firstPersonStarts = sentences.filter((sentence) =>
    sentence.startsWith("I ") || sentence.startsWith("I’m ") || sentence.startsWith("I've ")
  ).length;

  return sentences.length > 0 && firstPersonStarts / sentences.length > 0.45;
}

function openingFeelsAwkward(text: string, companyName?: string) {
  const paragraphs = text
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const openingParagraph = paragraphs[1] ?? "";
  const normalizedOpening = openingParagraph.toLowerCase();
  const awkwardPhrases = [
    "focus on real",
    "where i'm headed",
    "promise to let",
    "matches where i'm headed",
    "high-volume decisions"
  ];

  if (awkwardPhrases.some((phrase) => normalizedOpening.includes(phrase))) {
    return true;
  }

  if (!companyName) {
    return false;
  }

  return normalizedOpening.startsWith(`${companyName.toLowerCase()}'s`);
}

function closingMirrorsJobDescription(
  coverLetter: string,
  jobDescription: string
) {
  const coverLetterParagraphs = coverLetter
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const closingParagraph = coverLetterParagraphs[coverLetterParagraphs.length - 2] ?? "";
  const closingText = closingParagraph.toLowerCase();
  const normalizedJobDescription = jobDescription.toLowerCase();
  const mirroredPhrases = [
    "senior python engineers",
    "ships fast",
    "production backend",
    "real python at scale",
    "data pipelines"
  ];

  return mirroredPhrases.some(
    (phrase) =>
      closingText.includes(phrase) && normalizedJobDescription.includes(phrase)
  );
}

function qualityNotesLookReasonable(
  qualityNotes: ApplicationQualityNotes,
  tailoringContext: ApplicationTailoringContext,
  profileText: string
) {
  const normalizedProfileText = profileText.toLowerCase();
  const factsAreGrounded = qualityNotes.factsUsedFromResume.every((fact) =>
    normalizedProfileText.includes(fact.toLowerCase())
  );
  const requirementsAreRelevant = qualityNotes.jobRequirementsAddressed.every(
    (requirement) => tailoringContext.topRequirements.includes(requirement)
  );

  return factsAreGrounded && requirementsAreRelevant;
}
