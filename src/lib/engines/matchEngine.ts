// This file compares a parsed profile against a parsed job to produce a fit result.
// The score is always computed in code so the app does not depend on an LLM for ranking.
import { parseProfileText } from "@/lib/engines/profileEngine";
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
  "django",
  "git",
  "docker",
  "node",
  "node.js",
  "api",
  "analytics",
  "product",
  "design",
  "testing",
  "aws"
] as const;

const JOB_METADATA_PATTERN =
  /(applied\s+\d+\s+(seconds?|minutes?|hours?|days?)\s+ago|reposted|promoted|applicants?|clicked apply|actively reviewing|easy apply|matches your job preferences|hybrid|on-site|onsite|remote|full[- ]time|part[- ]time|contract|save\b|see how you compare|meet the hiring team)/i;

const RESPONSIBILITY_NOISE_PATTERN =
  /(skills match|matches your job preferences|preferred\s*-|employment type|work location|about the job|job poster|talent acquisition|message$|signature)/i;
const RESPONSIBILITY_SECTION_PATTERN =
  /^(key responsibilities|responsibilities|what you'll do|what you will do)\s*:?\s*$/i;
const SECTION_HEADING_PATTERN =
  /^(key responsibilities|responsibilities|what you'll do|what you will do|required qualifications|preferred qualifications|education|about the job|about the role|employment type|work location)\s*:?\s*$/i;

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
  return analyzeParsedJobFit(parsedProfile, parsedJob);
}

export function analyzeParsedJobFit(
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob
): FitAnalysis {
  const deterministicAnalysis = computeDeterministicFitAnalysis(
    parsedProfile,
    parsedJob
  );

  return {
    ...deterministicAnalysis,
    reasoning: buildDeterministicReasoning(parsedJob, deterministicAnalysis)
  };
}

export function parseJobText(jobDescription: string): ParsedJob {
  const lines = cleanJobLines(jobDescription);
  const title = extractRoleTitle(lines);
  const company = extractCompanyName(lines, jobDescription);
  const responsibilities = extractResponsibilities(lines);
  const normalizedKeywords = extractNormalizedKeywords(
    [title, ...responsibilities, ...lines].join("\n")
  );
  const requirements = extractRequiredSkills(lines, normalizedKeywords);
  const bonusKeywords = extractBonusKeywords(normalizedKeywords, requirements);

  return {
    title,
    company,
    locationText: extractLocationText(lines),
    responsibilities,
    requirements,
    keywords: [...requirements, ...bonusKeywords]
  };
}

function cleanJobLines(jobDescription: string) {
  return jobDescription
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !JOB_METADATA_PATTERN.test(line))
    .filter((line) => !/^\d+\s+of\s+\d+\s+skills\s+match$/i.test(line))
    .filter((line) => !/^retry premium|message$|save$|easy apply$/i.test(line))
    .filter((line) => !/^description:?$/i.test(line))
    .filter((line) => !/^about the job$/i.test(line));
}

function extractRoleTitle(lines: string[]) {
  const candidate =
    lines.find(
      (line) =>
        /(developer|engineer|analyst|designer|manager|specialist|intern|consultant)/i.test(
          line
        ) && !/team|hiring/i.test(line)
    ) ?? "this role";

  const cleaned = candidate
    .replace(/\s*[-|].*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned.split(/\s+/).length > 6 || JOB_METADATA_PATTERN.test(cleaned)
    ? "this role"
    : cleaned;
}

function extractCompanyName(lines: string[], rawText: string) {
  const savedPatternMatch = rawText.match(/Save .+? at ([^\n]+)/i);
  const savedCompany = normalizeCompanyCandidate(savedPatternMatch?.[1]);
  if (savedCompany && !JOB_METADATA_PATTERN.test(savedCompany)) {
    return savedCompany;
  }

  const titleIndex = lines.findIndex((line) =>
    /(developer|engineer|analyst|designer|manager|specialist|intern|consultant)/i.test(
      line
    )
  );
  const companyCandidate =
    titleIndex >= 0 ? lines.slice(titleIndex + 1, titleIndex + 4).map(normalizeCompanyCandidate).find(isCompanyCandidate) : undefined;

  return companyCandidate;
}

function normalizeCompanyCandidate(line?: string) {
  if (!line) {
    return undefined;
  }

  return line
    .replace(/^about\s+/i, "")
    .replace(/^company[:\s-]*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .replace(/\s*[·-]\s*(reposted|promoted|actively reviewing).*/i, "")
    .trim();
}

function isCompanyCandidate(line?: string) {
  if (!line) {
    return false;
  }

  return (
    line.length > 1 &&
    line.length < 80 &&
    !JOB_METADATA_PATTERN.test(line) &&
    !RESPONSIBILITY_NOISE_PATTERN.test(line) &&
    !/\b[A-Z]{2}\b/.test(line) &&
    !/\b(austin|boston|new york|san francisco|seattle|remote|hybrid)\b/i.test(line) &&
    !/preferred|work location|employment type|required qualifications|key responsibilities|skills match/i.test(
      line
    ) &&
    !/developer|engineer|analyst|designer|manager|specialist|intern|consultant/i.test(line)
  );
}

function extractResponsibilities(lines: string[]) {
  const sectionLines = extractResponsibilitySection(lines);
  const bulletLikeLines = sectionLines.filter((line) =>
    /^(design|develop|build|work|support|implement|create|maintain|collaborate|establish|provide|write|automate|manage)/i.test(
      line
    )
  );

  return (bulletLikeLines.length > 0 ? bulletLikeLines : sectionLines)
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter((line) => line.length > 18)
    .filter((line) => !RESPONSIBILITY_NOISE_PATTERN.test(line))
    .filter((line) => !/^\d+\s+of\s+\d+\s+skills\s+match$/i.test(line))
    .filter((line) => !/^(python developer|junior python developer)$/i.test(line))
    .filter((line) => !/required qualifications|preferred qualifications|education/i.test(line))
    .slice(0, 3);
}

function extractResponsibilitySection(lines: string[]) {
  const startIndex = lines.findIndex((line) => RESPONSIBILITY_SECTION_PATTERN.test(line));

  if (startIndex === -1) {
    return [];
  }

  const sectionLines: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (SECTION_HEADING_PATTERN.test(line)) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines;
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

  return Array.from(new Set([...matchedKnownSkills, ...tokenKeywords])).slice(0, 16);
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
    /(require|qualification|must|need|experience|skill|proficiency)/i.test(line)
  );
  const requirementText = requirementLines.join(" ").toLowerCase();
  const matchedRequirementSkills = keywords.filter((keyword) =>
    requirementText.includes(keyword)
  );

  return matchedRequirementSkills.length > 0
    ? matchedRequirementSkills.slice(0, 6)
    : keywords.slice(0, 6);
}

function extractBonusKeywords(keywords: string[], requiredSkills: string[]) {
  return keywords.filter((keyword) => !requiredSkills.includes(keyword)).slice(0, 4);
}

function extractLocationText(lines: string[]) {
  return lines.find((line) => /remote|hybrid|onsite|on-site|, [A-Z]{2}/i.test(line));
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

  return strengths.length > 0
    ? strengths
    : ["The profile shows some transferable experience, but direct overlap is limited."];
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

function buildDeterministicReasoning(parsedJob: ParsedJob, scoreBreakdown: ScoreBreakdown) {
  return `The score is based on required-skill overlap, bonus-skill overlap, and title alignment for the ${parsedJob.title} role. Top strengths: ${scoreBreakdown.strengths.slice(0, 2).join(" ")}.`;
}
