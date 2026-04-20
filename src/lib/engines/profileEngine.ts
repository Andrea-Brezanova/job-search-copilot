// This file parses raw profile text into a lightweight structured shape.
import { generateStructuredOutput } from "@/lib/llm/client";
import { PARSE_PROFILE_PROMPT } from "@/lib/llm/prompts";
import type { ParsedProfile } from "@/lib/types";

const DEFAULT_SKILL_KEYWORDS = [
  "react",
  "next.js",
  "typescript",
  "javascript",
  "tailwind",
  "supabase",
  "product",
  "design",
  "python",
  "sql",
  "node",
  "api",
  "analytics",
  "leadership"
];

export async function parseProfileText(profileText: string): Promise<ParsedProfile> {
  const llmResult = await generateStructuredOutput<ParsedProfile>({
    prompt: PARSE_PROFILE_PROMPT,
    input: profileText
  });

  if (llmResult) {
    return llmResult;
  }

  const normalizedText = profileText.toLowerCase();
  const skills = DEFAULT_SKILL_KEYWORDS.filter((skill) =>
    normalizedText.includes(skill)
  );

  return {
    summary: profileText.slice(0, 220).trim(),
    skills: skills.length > 0 ? skills : ["communication", "problem solving"],
    experienceLevel: inferExperienceLevel(normalizedText),
    targetRoles: inferTargetRoles(normalizedText)
  };
}

function inferExperienceLevel(profileText: string) {
  if (profileText.includes("senior") || profileText.includes("lead")) {
    return "Senior";
  }

  if (profileText.includes("manager")) {
    return "Manager";
  }

  if (profileText.includes("junior") || profileText.includes("intern")) {
    return "Junior";
  }

  return "Mid-level";
}

function inferTargetRoles(profileText: string) {
  const possibleRoles = [
    "Software Engineer",
    "Frontend Engineer",
    "Product Manager",
    "Designer",
    "Data Analyst"
  ];

  const matchedRoles = possibleRoles.filter((role) =>
    profileText.includes(role.toLowerCase())
  );

  return matchedRoles.length > 0 ? matchedRoles : ["Generalist"];
}
