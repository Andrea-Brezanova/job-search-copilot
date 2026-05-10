import { debugJson } from "@/lib/logging";
import type { ExperienceEvidenceCard } from "@/lib/types";

export type ExperienceParseResult = {
  detectedSections: string[];
  rawExperienceBlocks: string[];
  experiences: ExperienceEvidenceCard[];
};

const SKILL_PRIORITY = [
  "python",
  "django",
  "sql",
  "postgresql",
  "mysql",
  "docker",
  "git",
  "javascript",
  "typescript",
  "react"
] as const;

export function extractResumeExperiences(profileText: string): ExperienceParseResult {
  const detectedSections = detectResumeSections(profileText);
  const rawExperienceBlocks = splitExperienceBlocks(profileText, detectedSections);

  const experiences = rawExperienceBlocks
    .map((block) => parseExperienceBlock(block))
    .filter((card): card is ExperienceEvidenceCard => Boolean(card));

  return {
    detectedSections,
    rawExperienceBlocks,
    experiences,
  };
}

export function buildFallbackPrimaryStoryFromResume(
  profileText: string
): ExperienceEvidenceCard | undefined {
  const candidateSentences = profileText
    .split(/\n+/)
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter((line) => line.length > 20)
    .filter((line) => !looksLikePureContactLine(line))
    .filter((line) =>
      /(built|developed|created|designed|analyzed|implemented|managed|supported|validated|improved|led|coordinated|worked|researched|deployed|tested)/i.test(
        line
      )
    )
    .slice(0, 3)
    .map(cleanSentence);

  if (candidateSentences.length === 0) {
    return undefined;
  }

  return {
    role: "Relevant experience",
    organization: "",
    context: candidateSentences[0],
    actions: candidateSentences,
    outcome: candidateSentences.find((sentence) =>
      /(reduced|improved|optimized|streamlined|increased|decreased|efficiency)/i.test(sentence)
    ),
    skills: SKILL_PRIORITY.filter((skill) => profileText.toLowerCase().includes(skill)).map(formatSkill),
  };
}

export function getExperienceDetailScore(experience: ExperienceEvidenceCard) {
  return [
    experience.context,
    ...experience.actions,
    experience.outcome ?? "",
    experience.organization,
    experience.role,
  ]
    .join(" ")
    .length;
}

function splitExperienceBlocks(profileText: string, detectedSections: string[]) {
  const sectionHeadingSet = new Set(detectedSections.map((section) => section.toLowerCase()));
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const experienceSectionStart = lines.findIndex((line) =>
    /^(relevant history|experience|work history|employment history|professional experience|projects)$/i.test(
      line
    )
  );

  if (experienceSectionStart === -1) {
    return profileText
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block.length > 20);
  }

  const sectionLines: string[] = [];
  for (const line of lines.slice(experienceSectionStart + 1)) {
    if (
      sectionHeadingSet.has(line.toLowerCase()) &&
      !/^(relevant history|experience|work history|employment history|professional experience|projects)$/i.test(
        line
      )
    ) {
      break;
    }
    sectionLines.push(line);
  }

  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of sectionLines) {
    if (looksLikeExperienceHeading(line) && currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n").trim());
      currentBlock = [line];
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n").trim());
  }

  return blocks.filter((block) => block.length > 20);
}

function looksLikeExperienceHeading(line: string) {
  return (
    /\b(intern|analyst|engineer|developer|specialist|support|training|service|manager|coordinator|assistant)\b/i.test(
      line
    ) &&
    /\b\d{2}\/\d{4}\s+to\s+\d{2}\/\d{4}\b/i.test(line)
  );
}

function parseExperienceBlock(block: string): ExperienceEvidenceCard | null {
  if (looksLikeHeaderOnlyBlock(block)) {
    debugJson("rejectReason", { block, reason: "header-only block" });
    return null;
  }

  const lines = block
    .split("\n")
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !looksLikePureContactLine(line));

  if (lines.length === 0) {
    debugJson("rejectReason", { block, reason: "empty after contact filtering" });
    return null;
  }

  const header = lines[0];
  const headerParts = header
    .split(/[|@]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const bodyLines = lines.slice(1).filter((line) => line.length > 15);
  const contentLines = bodyLines.length > 0 ? bodyLines : lines.filter((line) => line.length > 15);

  if (contentLines.length === 0) {
    debugJson("rejectReason", { block, reason: "no substantial content lines" });
    return null;
  }

  const role = inferExperienceRole(headerParts, contentLines);
  const organization = inferExperienceOrganization(headerParts, header, contentLines);
  const actions = dedupeStrings(
    contentLines
      .slice(0, 3)
      .map(cleanSentence)
      .filter(Boolean)
  ).slice(0, 3);
  const context = cleanSentence(contentLines[0]);
  const hasActionLikeContent = /built|developed|created|designed|analyzed|implemented|managed|supported|validated|improved|led|coordinated|worked|researched|deployed|tested/i.test(
    [header, ...contentLines].join(" ")
  );
  const hasTechnicalOrWorkKeywords = /(python|sql|django|react|typescript|javascript|docker|git|data|analysis|customer|support|project|procurement|database|report|requirements|qa|testing|workflow)/i.test(
    [header, ...contentLines].join(" ")
  );

  if (!hasActionLikeContent && !hasTechnicalOrWorkKeywords) {
    debugJson("rejectReason", {
      block,
      reason: "missing verbs/technical/work keywords"
    });
    return null;
  }

  if (actions.length === 0 && !context) {
    debugJson("rejectReason", { block, reason: "no usable actions or context" });
    return null;
  }

  const outcome = contentLines.find((line) =>
    /(reduced|improved|optimized|streamlined|increased|decreased|efficiency|manual data entry)/i.test(
      line
    )
  );
  const blockText = block.toLowerCase();
  const skills = SKILL_PRIORITY.filter((skill) =>
    blockText.includes(skill.toLowerCase())
  ).map(formatSkill);

  return {
    role: role || "Relevant experience",
    organization,
    context,
    actions,
    outcome: outcome ? cleanSentence(outcome) : undefined,
    skills
  };
}

function inferExperienceRole(
  headerParts: string[],
  contentLines: string[]
) {
  const headerCandidate = headerParts[0]?.trim() || "";
  if (
    headerCandidate &&
    /\b(intern|analyst|engineer|developer|manager|assistant|specialist|consultant|coordinator|associate|researcher|volunteer|student)\b/i.test(
      headerCandidate
    )
  ) {
    return headerCandidate;
  }

  const contentMatch = contentLines
    .join(" ")
    .match(
      /\b(intern|analyst|engineer|developer|manager|assistant|specialist|consultant|coordinator|associate|researcher|volunteer|student)\b/i
    );
  if (contentMatch) {
    return toTitleCase(contentMatch[0]);
  }

  return headerCandidate;
}

function inferExperienceOrganization(
  headerParts: string[],
  header: string,
  contentLines: string[]
) {
  const headerOrganization = headerParts[1]?.trim() || "";
  if (headerOrganization) {
    return headerOrganization;
  }

  const firstBodyLine = contentLines[0]?.trim() || "";
  if (
    firstBodyLine &&
    !/[.!?]$/.test(firstBodyLine) &&
    /,/.test(firstBodyLine) &&
    !/\b(designed|developed|created|built|managed|supported|validated|improved|worked|collaborated)\b/i.test(
      firstBodyLine
    )
  ) {
    return firstBodyLine.split(",")[0]?.trim() || firstBodyLine;
  }

  const orgLikeLine = [header, ...contentLines].find((line) =>
    /\bat\b|\bfor\b|university|institute|company|corp|llc|inc|museum|agency|group/i.test(line)
  );

  if (!orgLikeLine) {
    return "";
  }

  const match =
    orgLikeLine.match(/\bat\s+([A-Z][A-Za-z0-9&.,' -]+)/) ||
    orgLikeLine.match(/\bfor\s+([A-Z][A-Za-z0-9&.,' -]+)/);

  return match?.[1]?.trim() || "";
}

function detectResumeSections(profileText: string) {
  return profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) =>
      /^(summary|technical skills|skills|relevant history|experience|education|certifications|projects|volunteer experience)$/i.test(
        line
      )
    );
}

function looksLikeHeaderOnlyBlock(block: string) {
  const normalized = block.toLowerCase();
  return (
    ((normalized.includes("@") || /linkedin|github|phone|email/i.test(block)) &&
      !/\b(intern|analyst|engineer|developer|manager|specialist)\b/i.test(block)) ||
    /^(relevant history|technical skills|skills|education|summary)$/i.test(
      normalized
    )
  );
}

function looksLikePureContactLine(line: string) {
  return (
    line.includes("@") ||
    /linkedin|github|phone|email/i.test(line) ||
    /^\+?\d[\d\s().-]+$/.test(line)
  );
}

function cleanSentence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSkill(skill: string) {
  switch (skill.toLowerCase()) {
    case "python":
      return "Python";
    case "django":
      return "Django";
    case "sql":
      return "SQL";
    case "postgresql":
      return "PostgreSQL";
    case "mysql":
      return "MySQL";
    case "docker":
      return "Docker";
    case "git":
      return "Git";
    case "javascript":
      return "JavaScript";
    case "typescript":
      return "TypeScript";
    case "react":
      return "React";
    default:
      return skill;
  }
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}
