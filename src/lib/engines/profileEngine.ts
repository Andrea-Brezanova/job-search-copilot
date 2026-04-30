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

const SKILLS_SECTION_HEADING =
  /^(technical skills|skills|core skills|skills & tools|tools|technologies|tech stack)$/i;

const BAD_NAME_HEADINGS =
  /^(relevant history|summary|technical skills|skills|certifications|education|experience)$/i;
const INSTITUTION_NAME_PATTERN = /(university|institute|college|school|faculty|academy)/i;

export async function parseProfileText(profileText: string): Promise<ParsedProfile> {
  const normalizedText = profileText.toLowerCase();
  const explicitSkills = extractExplicitSkills(profileText);
  const detectedSkills = DEFAULT_SKILL_KEYWORDS.filter((skill) =>
    normalizedText.includes(skill)
  );
  const skills = Array.from(new Set([...explicitSkills, ...detectedSkills]));
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
  const email =
    profileText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const candidate = lines
    .slice(0, 12)
    .map((line) => normalizePotentialNameLine(line, email))
    .find(looksLikeNameLine);
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
    !BAD_NAME_HEADINGS.test(compact) &&
    !INSTITUTION_NAME_PATTERN.test(compact) &&
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
    const joined = line.replace(/\s+/g, "");
    return joined.charAt(0) + joined.slice(1).toLowerCase();
  }

  return collapsed
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
}

function normalizePotentialNameLine(line: string, email: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return "";
  }

  if (/^[.\s]+$/.test(trimmed)) {
    return "";
  }

  if (looksLikeSpacedUppercaseName(trimmed)) {
    const joined = trimmed.replace(/\s+/g, "");
    const emailParts = (email.split("@")[0] ?? "")
      .split(/[._-]+/)
      .filter(Boolean);

    if (emailParts.length >= 1) {
      const [first, last = ""] = emailParts;
      const normalizedJoined = joined.toLowerCase();
      if (normalizedJoined.startsWith(first.toLowerCase())) {
        const remaining = joined.slice(first.length).trim();
        if (
          remaining.length >= 2 &&
          (!last || remaining.toLowerCase().startsWith(last.toLowerCase()))
        ) {
          return `${first} ${remaining}`;
        }
      }
    }

    return joined;
  }

  return trimmed.replace(/\s+/g, " ");
}

function looksLikeSpacedUppercaseName(line: string) {
  const collapsed = line.replace(/\s+/g, "");
  const tokens = line.split(/\s+/).filter(Boolean);

  return (
    collapsed.length >= 8 &&
    /^[A-Z]+$/.test(collapsed) &&
    tokens.length >= 4 &&
    tokens.every((token) => /^[A-Z]{1,3}$/.test(token))
  );
}

function looksLikeContactOrProfileLine(line: string) {
  return (
    line.includes("@") ||
    /linkedin|github|profiles:|\|\s*\(?\d{3}\)?|[A-Z]{2},\s*\d{5}/i.test(line) ||
    /[.,:;|/\\()]/.test(line)
  );
}

function extractExplicitSkills(profileText: string) {
  const lines = profileText.split("\n").map((line) => line.trim());
  const explicitSkills: string[] = [];

  const sectionLines: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !SKILLS_SECTION_HEADING.test(line)) {
      continue;
    }

    for (const candidateLine of lines.slice(index + 1, index + 5)) {
      if (!candidateLine) {
        break;
      }
      if (
        BAD_NAME_HEADINGS.test(candidateLine) ||
        /(experience|education|summary|certifications|projects|volunteer)/i.test(
          candidateLine
        )
      ) {
        break;
      }
      sectionLines.push(candidateLine);
    }
  }

  for (const line of sectionLines) {
    for (const token of line.split(/[|,/•·]+/)) {
      const normalized = token.trim().toLowerCase();
      if (normalized && DEFAULT_SKILL_KEYWORDS.includes(normalized)) {
        explicitSkills.push(normalized);
      }
    }
  }

  return explicitSkills;
}

function extractProfileKeywords(profileText: string, detectedSkills: string[]) {
  const tokenKeywords = profileText
    .toLowerCase()
    .replace(/[^a-z0-9\s.+#-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return Array.from(new Set([...detectedSkills, ...tokenKeywords])).slice(0, 15);
}
