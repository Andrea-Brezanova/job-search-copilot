// This file compares a parsed profile against a parsed job to produce a fit result.
import { generateStructuredOutput } from "@/lib/llm/client";
import { ANALYZE_JOB_PROMPT } from "@/lib/llm/prompts";
import type { FitAnalysis, ParsedJob } from "@/lib/types";
import { parseProfileText } from "@/lib/engines/profileEngine";

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
  "years"
]);

export async function analyzeJobFit(
  profileText: string,
  jobDescription: string
): Promise<FitAnalysis> {
  const llmResult = await generateStructuredOutput<FitAnalysis>({
    prompt: ANALYZE_JOB_PROMPT,
    input: `PROFILE:\n${profileText}\n\nJOB:\n${jobDescription}`
  });

  if (llmResult) {
    return llmResult;
  }

  const parsedProfile = await parseProfileText(profileText);
  const parsedJob = parseJobText(jobDescription);

  return buildMockFitAnalysis(parsedProfile.skills, parsedJob);
}

export function parseJobText(jobDescription: string): ParsedJob {
  const lines = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const keywords = extractKeywords(jobDescription);

  return {
    title: lines[0] ?? "Untitled Role",
    responsibilities: lines.slice(1, 5),
    requirements: keywords.slice(0, 8),
    keywords
  };
}

function buildMockFitAnalysis(profileSkills: string[], parsedJob: ParsedJob): FitAnalysis {
  const normalizedProfileSkills = profileSkills.map((skill) => skill.toLowerCase());
  const matchingKeywords = parsedJob.keywords.filter((keyword) =>
    normalizedProfileSkills.includes(keyword.toLowerCase())
  );
  const missingKeywords = parsedJob.keywords.filter(
    (keyword) => !normalizedProfileSkills.includes(keyword.toLowerCase())
  );

  const fitScore = Math.max(
    35,
    Math.min(
      95,
      Math.round((matchingKeywords.length / Math.max(parsedJob.keywords.length, 1)) * 100)
    )
  );

  const recommendation: FitAnalysis["recommendation"] =
    fitScore >= 70 ? "Apply" : fitScore >= 50 ? "Maybe" : "Skip";

  return {
    fitScore,
    strengths:
      matchingKeywords.length > 0
        ? matchingKeywords.slice(0, 4).map((keyword) => `Relevant experience with ${keyword}.`)
        : ["Your profile shows general transferable experience for this role."],
    gaps:
      missingKeywords.length > 0
        ? missingKeywords.slice(0, 4).map((keyword) => `The job emphasizes ${keyword}.`)
        : ["No major keyword gaps detected in the mock analysis."],
    recommendation,
    reasoning: `This initial score is based on keyword overlap between your profile and the job requirements for ${parsedJob.title}.`
  };
}

function extractKeywords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s.+#-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    )
  ).slice(0, 12);
}
