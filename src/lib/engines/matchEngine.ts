// This file compares a parsed profile against a parsed job to produce a fit result.
// The score is always computed in code so the app does not depend on an LLM for ranking.
import { parseProfileText } from "@/lib/engines/profileEngine";
import { generateStructuredOutput } from "@/lib/llm/client";
import { ANALYZE_JOB_PROMPT } from "@/lib/llm/prompts";
import type { FitAnalysis, ParsedJob, ParsedProfile } from "@/lib/types";

const STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "for",
  "that",
  "from",
  "this",
  "have",
  "will",
  "your",
  "about",
  "into",
  "their",
  "them",
  "role",
  "team",
  "work",
  "years",
  "experience",
  "required",
  "preferred",
  "plus",
  "nice",
  "looking",
  "candidate"
]);

const KNOWN_SKILLS = [
  "react",
  "next.js",
  "typescript",
  "javascript",
  "tailwind",
  "supabase",
  "python",
  "sql",
  "node",
  "node.js",
  "api",
  "analytics",
  "leadership",
  "product",
  "design",
  "figma",
  "accessibility",
  "testing",
  "graphql",
  "aws",
  "docker",
  "css",
  "html",
  "communication",
  "problem solving"
] as const;

type ScoreBreakdown = {
  fitScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: FitAnalysis["recommendation"];
};

export async function analyzeJobFit(
  profileText: string,
  jobDescription: string
): Promise<FitAnalysis> {
  const parsedProfile = await parseProfileText(profileText);
  const parsedJob = parseJobText(jobDescription);
  const deterministicAnalysis = computeDeterministicFitAnalysis(
    parsedProfile,
    parsedJob
  );
  const reasoning = await generateOptionalReasoning(
    parsedProfile,
    parsedJob,
    deterministicAnalysis
  );

  return {
    ...deterministicAnalysis,
    reasoning
  };
}

export function parseJobText(jobDescription: string): ParsedJob {
  const lines = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedKeywords = extractNormalizedKeywords(jobDescription);
  const requirements = extractRequiredSkills(lines, normalizedKeywords);
  const bonusKeywords = extractBonusKeywords(normalizedKeywords, requirements);

  return {
    title: lines[0] ?? "Untitled Role",
    company: extractCompanyName(lines),
    locationText: extractLocationText(lines),
    responsibilities: lines.slice(1, 5),
    requirements,
    keywords: [...requirements, ...bonusKeywords]
  };
}

function computeDeterministicFitAnalysis(
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob
): ScoreBreakdown {
  const normalizedProfileSkills = extractNormalizedSkills(parsedProfile.skills);
  const requiredSkills = parsedJob.requirements;
  const bonusSkills = extractBonusKeywords(parsedJob.keywords, requiredSkills);

  const requiredOverlap = computeOverlap(normalizedProfileSkills, requiredSkills);
  const bonusOverlap = computeOverlap(normalizedProfileSkills, bonusSkills);
  const missingRequiredSkills = determineMissingSkills(
    normalizedProfileSkills,
    requiredSkills
  );
  const titleSimilarityScore = computeTitleSimilarityScore(
    parsedProfile.targetRoles,
    parsedJob.title
  );

  // Scoring model:
  // - up to 70 points from matching required skills
  // - up to 20 points from matching bonus or adjacent skills
  // - 10 points from role-title similarity
  const requiredScore = calculateWeightedScore(requiredOverlap, requiredSkills.length, 70);
  const bonusScore = calculateWeightedScore(bonusOverlap, bonusSkills.length, 20);
  const fitScore = clampScore(requiredScore + bonusScore + titleSimilarityScore);
  const recommendation = assignRecommendation(fitScore);

  return {
    fitScore,
    strengths: buildStrengths(requiredOverlap, bonusOverlap, titleSimilarityScore),
    gaps: buildGaps(missingRequiredSkills),
    recommendation
  };
}

function extractNormalizedSkills(skills: string[]) {
  return Array.from(new Set(skills.map((skill) => skill.toLowerCase())));
}

function extractNormalizedKeywords(text: string) {
  const normalizedText = text.toLowerCase();
  const matchedKnownSkills = KNOWN_SKILLS.filter((skill) => normalizedText.includes(skill));
  const tokenKeywords = normalizedText
    .replace(/[^a-z0-9\s.+#-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return Array.from(new Set([...matchedKnownSkills, ...tokenKeywords])).slice(0, 12);
}

function computeOverlap(profileSkills: string[], jobSkills: string[]) {
  return jobSkills.filter((skill) => profileSkills.includes(skill));
}

function determineMissingSkills(profileSkills: string[], requiredSkills: string[]) {
  return requiredSkills.filter((skill) => !profileSkills.includes(skill));
}

function assignRecommendation(fitScore: number): FitAnalysis["recommendation"] {
  if (fitScore >= 75) {
    return "Apply";
  }

  if (fitScore >= 50) {
    return "Maybe";
  }

  return "Skip";
}

function calculateWeightedScore(overlap: string[], totalSkills: number, maxPoints: number) {
  if (totalSkills === 0) {
    return 0;
  }

  return Math.round((overlap.length / totalSkills) * maxPoints);
}

function computeTitleSimilarityScore(profileRoles: string[], jobTitle: string) {
  const profileRoleKeywords = Array.from(
    new Set(
      profileRoles
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    )
  );
  const jobTitleKeywords = Array.from(
    new Set(
      jobTitle
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    )
  );

  const overlap = computeOverlap(profileRoleKeywords, jobTitleKeywords);
  return overlap.length > 0 ? 10 : 0;
}

function extractRequiredSkills(lines: string[], keywords: string[]) {
  const requirementLines = lines.filter((line) =>
    /(require|qualification|must|need|experience|skill)/i.test(line)
  );

  const requirementText = requirementLines.join(" ").toLowerCase();
  const matchedRequirementSkills = keywords.filter((keyword) =>
    requirementText.includes(keyword)
  );

  if (matchedRequirementSkills.length > 0) {
    return matchedRequirementSkills.slice(0, 6);
  }

  return keywords.slice(0, 6);
}

function extractBonusKeywords(keywords: string[], requiredSkills: string[]) {
  return keywords.filter((keyword) => !requiredSkills.includes(keyword)).slice(0, 4);
}

function extractCompanyName(lines: string[]) {
  const possibleCompanyLine = lines[1];

  if (
    possibleCompanyLine &&
    possibleCompanyLine.length < 80 &&
    !possibleCompanyLine.startsWith("-") &&
    !/remote|hybrid|onsite|location/i.test(possibleCompanyLine)
  ) {
    return possibleCompanyLine;
  }

  return undefined;
}

function extractLocationText(lines: string[]) {
  return lines.find((line) => /remote|hybrid|onsite|location|, [A-Z]{2}/i.test(line));
}

function buildStrengths(
  requiredOverlap: string[],
  bonusOverlap: string[],
  titleSimilarityScore: number
) {
  const strengths = [
    ...requiredOverlap.slice(0, 3).map((skill) => `Matches a required skill: ${skill}.`),
    ...bonusOverlap.slice(0, 2).map((skill) => `Brings relevant bonus experience in ${skill}.`)
  ];

  if (titleSimilarityScore === 10) {
    strengths.push("The profile's target roles align with the job title.");
  }

  if (strengths.length > 0) {
    return strengths;
  }

  return ["The profile shows some transferable experience, but direct overlap is limited."];
}

function buildGaps(missingRequiredSkills: string[]) {
  if (missingRequiredSkills.length === 0) {
    return ["No major required-skill gaps were detected from the parsed job description."];
  }

  return missingRequiredSkills
    .slice(0, 4)
    .map((skill) => `Missing or unclear evidence for required skill: ${skill}.`);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

async function generateOptionalReasoning(
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob,
  scoreBreakdown: ScoreBreakdown
) {
  const llmReasoning = await generateStructuredOutput<string>({
    prompt: ANALYZE_JOB_PROMPT,
    input: [
      `PROFILE SUMMARY: ${parsedProfile.summary}`,
      `PROFILE SKILLS: ${parsedProfile.skills.join(", ")}`,
      `TARGET ROLES: ${parsedProfile.targetRoles.join(", ")}`,
      `JOB TITLE: ${parsedJob.title}`,
      `JOB REQUIREMENTS: ${parsedJob.requirements.join(", ")}`,
      `JOB KEYWORDS: ${parsedJob.keywords.join(", ")}`,
      `FIT SCORE: ${scoreBreakdown.fitScore}`,
      `RECOMMENDATION: ${scoreBreakdown.recommendation}`,
      `STRENGTHS: ${scoreBreakdown.strengths.join(" | ")}`,
      `GAPS: ${scoreBreakdown.gaps.join(" | ")}`
    ].join("\n")
  });

  if (typeof llmReasoning === "string" && llmReasoning.trim()) {
    return llmReasoning.trim();
  }

  return `The score is based on required-skill overlap, bonus-skill overlap, and role-title alignment for the ${parsedJob.title} position.`;
}
