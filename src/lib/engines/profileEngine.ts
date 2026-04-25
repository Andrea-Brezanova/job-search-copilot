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
  "django",
  "git",
  "docker",
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
    name: extractProfileName(profileText),
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
    .filter((line) => line.length > 20)
    .filter((line) => !looksLikeContactOrProfileLine(line));

  const prioritizedLines = [
    ...lines.filter((line) =>
      /(django|procurement|relational database|manual data entry|deployed|developed|designed)/i.test(
        line
      )
    ),
    ...lines.filter((line) =>
      /(wayfair|sql|validate|debug|qa|data correctness|frontend|backend data)/i.test(
        line
      )
    ),
    ...lines.filter((line) =>
      /(built|led|managed|created|improved|launched|supported|implemented|worked|experience)/i.test(
        line
      )
    )
  ];

  const selectedLines = prioritizedLines.length > 0 ? prioritizedLines : lines;
  return Array.from(new Set(selectedLines)).slice(0, 4);
}

function extractProfileName(profileText: string) {
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const candidate = lines.slice(0, 5).find(looksLikeNameLine);
  return candidate ? normalizeProfileName(candidate) : "";
}

function looksLikeNameLine(line: string) {
  if (!line || looksLikeContactOrProfileLine(line)) {
    return false;
  }

  const compact = line.replace(/\s+/g, " ").trim();
  const words = compact.split(" ").filter(Boolean);

  return (
    words.length >= 2 &&
    words.length <= 3 &&
    !/[|/\\,:;()0-9]/.test(compact) &&
    compact.length <= 40 &&
    !/(engineer|developer|analyst|manager|intern|specialist|sql|python|django|react)/i.test(
      compact
    ) &&
    !/(summary|skills|experience|profile|optimization|bringing|ability|awareness)/i.test(
      compact
    ) &&
    /^[A-Za-z\s]+$/.test(compact)
  );
}

function normalizeProfileName(line: string) {
  const collapsed = line
    .replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (/^[A-Z](?:\s+[A-Z]){3,}$/.test(line.trim())) {
    return collapsed
      .replace(/\s+/g, "")
      .toLowerCase()
      .replace(/(^\w)/, (match) => match.toUpperCase());
  }

  return collapsed
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function looksLikeContactOrProfileLine(line: string) {
  return (
    line.includes("@") ||
    /linkedin|github|profiles:|\|\s*\(?\d{3}\)?|nantucket|ma,\s*\d{5}/i.test(line) ||
    /[A-Z]\s+[A-Z]\s+[A-Z]/.test(line) ||
    /[.,:;|/\\()]/.test(line)
  );
}

function extractProfileKeywords(profileText: string, detectedSkills: string[]) {
  const tokenKeywords = profileText
    .toLowerCase()
    .replace(/[^a-z0-9\s.+#-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return Array.from(new Set([...detectedSkills, ...tokenKeywords])).slice(0, 15);
}
