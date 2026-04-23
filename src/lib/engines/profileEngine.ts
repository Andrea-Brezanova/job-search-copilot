// This file parses raw profile text into a lightweight structured shape.
// The parser is deterministic so the matching flow does not depend on the LLM.
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
  const normalizedText = profileText.toLowerCase();
  const skills = DEFAULT_SKILL_KEYWORDS.filter((skill) =>
    normalizedText.includes(skill)
  );
  const highlights = extractResumeHighlights(profileText);
  const keywords = extractProfileKeywords(profileText, skills);

  return {
    summary: profileText.slice(0, 220).trim(),
    skills: skills.length > 0 ? skills : ["communication", "problem solving"],
    experienceLevel: inferExperienceLevel(normalizedText),
    targetRoles: inferTargetRoles(normalizedText),
    highlights,
    keywords
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

function extractResumeHighlights(profileText: string) {
  // Prefer bullet-like or sentence-like lines that contain concrete work context.
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 20);

  const prioritizedLines = lines.filter((line) =>
    /(built|led|managed|designed|developed|created|improved|launched|supported|implemented|worked|experience)/i.test(
      line
    )
  );

  const selectedLines = prioritizedLines.length > 0 ? prioritizedLines : lines;
  return selectedLines.slice(0, 4);
}

function extractProfileKeywords(profileText: string, detectedSkills: string[]) {
  const tokenKeywords = profileText
    .toLowerCase()
    .replace(/[^a-z0-9\s.+#-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return Array.from(new Set([...detectedSkills, ...tokenKeywords])).slice(0, 15);
}
