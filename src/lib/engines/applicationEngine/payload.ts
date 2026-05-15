import type {
  ApplicationBrief,
  ApplicationQualityNotes,
  ExperienceEvidenceCard,
  FitAnalysis,
  ParsedJob,
  ParsedProfile,
  PositioningStrategy,
} from "@/lib/types";
import { isCompleteStory } from "./stories";

export type ProfileContact = {
  name?: string;
  email?: string;
  phone?: string;
};

export type GenerationPayload = {
  resumeText: string;
  jobDescriptionText: string;
  requestedOutputs: Array<"cover_letter" | "email_text">;
  tone: string;
  parsedProfile: ParsedProfile;
  parsedJob: ParsedJob;
  fitAnalysis: FitAnalysis;
  parsedRole: string;
  parsedCompany?: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  supportedSkills: string[];
  growthAreas: string[];
  primaryStory: ExperienceEvidenceCard;
  secondaryStory?: ExperienceEvidenceCard;
  positioningStrategy: PositioningStrategy;
  applicationBrief: ApplicationBrief;
};

export type CoverLetterInputDebug = {
  company: string;
  role: string;
  responsibilityThemes: string[];
  primaryStory: ExperienceEvidenceCard | null;
  secondaryStory: ExperienceEvidenceCard | null;
  supportedSkills: string[];
  growthAreas: string[];
  candidateName: string;
  candidateEmail: string;
  isCompanyValid: boolean;
  isRoleValid: boolean;
  isPrimaryStoryComplete: boolean;
  isSecondaryStoryPresent: boolean;
  isCandidateNameValid: boolean;
};

export type GenerationValidationResult = {
  ok: boolean;
  failedField?: "candidateName" | "primaryStory" | "supportedSkills" | "role" | "jobDescription";
  reason?: string;
};

const JOB_METADATA_PATTERN =
  /(applied\s+\d+\s+(seconds?|minutes?|hours?|days?)\s+ago|reposted|promoted|applicants?|clicked apply|actively reviewing|easy apply|matches your job preferences|hybrid|on-site|onsite|remote|full[- ]time|part[- ]time|contract|save\b|see how you compare|meet the hiring team|show more options)/i;

const BAD_NAME_PATTERN =
  /(relevant history|summary|technical skills|skills|certifications|education|experience|profile|developer|engineer|analyst|manager|python|django|sql|javascript|typescript|react)/i;
const INSTITUTION_PATTERN =
  /(university|institute|college|school|faculty|academy)/i;
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

export function buildGenerationPayload(
  profileText: string,
  jobDescription: string,
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob,
  fitAnalysis: FitAnalysis,
  contact: ProfileContact,
  primaryStory: ExperienceEvidenceCard,
  secondaryStory: ExperienceEvidenceCard | undefined,
  positioningStrategy: PositioningStrategy
): GenerationPayload {
  const candidateName = resolveCandidateName(
    parsedProfile.name,
    contact.name,
    contact.email,
    profileText
  );
  const applicationBrief = buildApplicationBrief(
    parsedProfile,
    parsedJob,
    fitAnalysis,
    positioningStrategy,
    primaryStory,
    secondaryStory
  );

  return {
    resumeText: cleanResumeText(profileText),
    jobDescriptionText: cleanJobDescriptionText(jobDescription, parsedJob),
    requestedOutputs: ["cover_letter", "email_text"],
    tone: "human, concise, professional",
    parsedProfile,
    parsedJob,
    fitAnalysis,
    parsedRole: sanitizeRoleTitle(parsedJob.title),
    parsedCompany: sanitizeCompanyName(parsedJob.company),
    candidateName,
    candidateEmail: contact.email,
    candidatePhone: contact.phone,
    supportedSkills: selectSupportedSkills(
      parsedProfile.skills,
      parsedProfile.keywords,
      profileText,
      primaryStory,
      secondaryStory
    ),
    growthAreas: selectGrowthAreas(parsedJob, parsedProfile.skills),
    primaryStory,
    secondaryStory,
    positioningStrategy,
    applicationBrief,
  };
}

export function buildCoverLetterInputDebug(
  payload: GenerationPayload
): CoverLetterInputDebug {
  return {
    company: payload.parsedCompany ?? "",
    role: payload.parsedRole,
    responsibilityThemes: [],
    primaryStory: payload.primaryStory ?? null,
    secondaryStory: payload.secondaryStory ?? null,
    supportedSkills: payload.supportedSkills,
    growthAreas: payload.growthAreas,
    candidateName: payload.candidateName,
    candidateEmail: payload.candidateEmail ?? "",
    isCompanyValid:
      !payload.parsedCompany || !JOB_METADATA_PATTERN.test(payload.parsedCompany),
    isRoleValid:
      Boolean(payload.parsedRole) && payload.parsedRole !== "this role",
    isPrimaryStoryComplete: isCompleteStory(payload.primaryStory),
    isSecondaryStoryPresent: Boolean(payload.secondaryStory),
    isCandidateNameValid: isValidCandidateName(payload.candidateName),
  };
}

export function validateGenerationPayload(
  payload: GenerationPayload
): GenerationValidationResult {
  if (!payload.parsedRole || payload.parsedRole === "this role") {
    return {
      ok: false,
      failedField: "role",
      reason: "Could not extract a valid role from the job description."
    };
  }

  if (!isValidCandidateName(payload.candidateName)) {
    return {
      ok: false,
      failedField: "candidateName",
      reason: "Could not extract a valid candidate name from the resume header."
    };
  }

  if (!isCompleteStory(payload.primaryStory)) {
    return {
      ok: false,
      failedField: "primaryStory",
      reason: "Could not extract enough resume evidence to generate a cover letter."
    };
  }

  if (payload.supportedSkills.length === 0) {
    return {
      ok: false,
      failedField: "supportedSkills",
      reason: "Could not extract useful resume-supported skills for generation."
    };
  }

  const usableJobLines = payload.jobDescriptionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !JOB_METADATA_PATTERN.test(line));

  if (usableJobLines.length === 0) {
    return {
      ok: false,
      failedField: "jobDescription",
      reason: "The job description still contains metadata or is missing usable content."
    };
  }

  return { ok: true };
}

export function buildApplicationSummary(parsedProfile: ParsedProfile, role: string) {
  const summary = parsedProfile.highlights[0] || parsedProfile.summary;
  return summary
    ? `Generated a tailored application package for the ${role}. ${summary}`
    : `Generated a tailored application package for the ${role}.`;
}

export function buildQualityNotes(payload: GenerationPayload): ApplicationQualityNotes {
  return {
    factsUsedFromResume: payload.resumeText.split("\n").filter(Boolean).slice(0, 5),
    jobRequirementsAddressed: payload.jobDescriptionText
      .split("\n")
      .filter(Boolean)
      .slice(0, 5),
    growthAreasPhrasedCarefully: [],
  };
}

export function extractProfileContact(profileText: string): ProfileContact {
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email =
    profileText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone =
    profileText.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] || "";
  const nameLine = lines.find((line) => isValidCandidateName(line));

  return {
    name: nameLine ? toTitleCase(nameLine) : "",
    email,
    phone,
  };
}

function buildApplicationBrief(
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob,
  fitAnalysis: FitAnalysis,
  positioningStrategy: PositioningStrategy,
  primaryStory: ExperienceEvidenceCard,
  secondaryStory?: ExperienceEvidenceCard
): ApplicationBrief {
  const roleLabel = parsedJob.title === "this role" ? "the role" : parsedJob.title;

  return {
    candidateSummary: parsedProfile.summary || `Candidate with ${parsedProfile.experienceLevel.toLowerCase()}-level experience.`,
    jobSummary: `The role focuses on ${dedupeStrings([
      ...parsedJob.requirements,
      ...parsedJob.responsibilities,
      ...parsedJob.keywords,
    ])
      .slice(0, 3)
      .join(", ")}.`,
    matchLevel: positioningStrategy.matchLevel,
    strongestSellingPoints: dedupeStrings([
      positioningStrategy.strongestApplicationAngle,
      ...fitAnalysis.strengths,
      ...positioningStrategy.adjacentStrengths,
    ]).slice(0, 5),
    relevantResumeEvidence: dedupeStrings([
      primaryStory.context,
      ...primaryStory.actions,
      primaryStory.outcome ?? "",
      secondaryStory?.context ?? "",
      ...(secondaryStory?.actions ?? []),
      secondaryStory?.outcome ?? "",
    ]).filter(Boolean).slice(0, 6),
    transferableAngles: dedupeStrings([
      ...positioningStrategy.transferableMatches.map((match) => match.bridgeExplanation),
      ...positioningStrategy.adjacentStrengths,
    ]).slice(0, 5),
    companyOrRoleMotivation: [
      `The candidate is applying for ${roleLabel} because it aligns with their direction and strongest relevant evidence.`,
    ],
    gapsToHandleCarefully: positioningStrategy.gaps.map(
      (gap) => `${gap.requirement}: ${gap.handlingStrategy}`
    ),
    claimsToAvoid: positioningStrategy.claimsToAvoid,
    recommendedTone: positioningStrategy.recommendedTone,
    coverLetterOutline: [
      `Open with why ${roleLabel} fits the candidate's direction.`,
      "Lead with the strongest relevant story first.",
      "Use a supporting story that adds either direct evidence or a transferable bridge.",
      "Address gaps honestly without sounding apologetic.",
      "Close with a short Zoom CTA.",
    ],
    emailOutline: [
      `State interest in ${roleLabel}.`,
      "Use one concise proof point from the strongest story.",
      "Ask one clear Zoom-call question.",
    ],
  };
}

function resolveCandidateName(
  profileName: string | undefined,
  contactName: string | undefined,
  email: string | undefined,
  profileText: string
) {
  const candidates = [
    sanitizeCandidateName(profileName),
    sanitizeCandidateName(contactName),
    sanitizeCandidateName(extractFullNameFromResume(profileText)),
  ].filter(Boolean);

  return candidates.find(isValidCandidateName) || "";
}

function sanitizeCandidateName(name?: string) {
  if (!name) {
    return "";
  }

  const normalized = name.replace(/\s+/g, " ").trim();
  return isValidCandidateName(normalized) ? normalized : "";
}

function isValidCandidateName(name?: string) {
  if (!name) {
    return false;
  }

  const normalized = name.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");

  return (
    words.length >= 2 &&
    words.length <= 4 &&
    normalized.length <= 50 &&
    !/[|@,:;()0-9]/.test(normalized) &&
    !BAD_NAME_PATTERN.test(normalized) &&
    !INSTITUTION_PATTERN.test(normalized)
  );
}

function extractFullNameFromResume(profileText: string) {
  const email =
    profileText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => normalizeCandidateHeaderLine(line, email));

  const candidate = lines.find((line) => isValidCandidateName(line));
  return candidate ? toTitleCase(candidate) : "";
}

function sanitizeCompanyName(company?: string) {
  if (!company) {
    return undefined;
  }

  const normalized = company
    .replace(/^about\s+/i, "")
    .replace(/^company[:\s-]*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();

  if (
    !normalized ||
    JOB_METADATA_PATTERN.test(normalized) ||
    /^the job$/i.test(normalized) ||
    /^the role$/i.test(normalized) ||
    normalized.length > 80
  ) {
    return undefined;
  }

  return normalized;
}

function sanitizeRoleTitle(role?: string) {
  const normalized = role
    ?.replace(/^save\s+/i, "")
    .replace(/\s*[·|]\s*.*$/, "")
    .replace(/\s*-\s*(remote|hybrid|on-site|onsite|united states|usa|us|uk|canada|germany|france|spain|italy|australia|new zealand)\b.*$/i, "")
    .replace(/\s*,\s*(remote|hybrid|on-site|onsite|united states|usa|us|uk|canada|germany|france|spain|italy|australia|new zealand)\b.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!normalized || JOB_METADATA_PATTERN.test(normalized) || normalized.split(/\s+/).length > 10) {
    return "this role";
  }

  return normalized;
}

function cleanResumeText(profileText: string) {
  return profileText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^profiles?:/i.test(line))
    .join("\n")
    .slice(0, 6000);
}

function cleanJobDescriptionText(jobDescription: string, parsedJob: ParsedJob) {
  const cleanedLines = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !JOB_METADATA_PATTERN.test(line))
    .filter((line) => !/^\d+\s+of\s+\d+\s+skills\s+match$/i.test(line))
    .filter((line) => !/^retry premium|message$|save$|easy apply$/i.test(line))
    .slice(0, 120);

  const preferredLines = [
    sanitizeRoleTitle(parsedJob.title),
    parsedJob.company ? `Company: ${parsedJob.company}` : "",
    ...parsedJob.responsibilities,
    ...parsedJob.requirements,
  ]
    .filter(Boolean)
    .filter((line) => !JOB_METADATA_PATTERN.test(line));

  const combined = preferredLines.length > 1 ? preferredLines : cleanedLines;

  return combined.join("\n").slice(0, 5000);
}

function selectSupportedSkills(
  parsedSkills: string[],
  parsedKeywords: string[],
  profileText: string,
  primaryStory: ExperienceEvidenceCard,
  secondaryStory?: ExperienceEvidenceCard
) {
  const normalizedProfileText = profileText.toLowerCase();
  const normalizedParsedSkills = new Set(parsedSkills.map((skill) => skill.toLowerCase()));
  const normalizedParsedKeywords = new Set(parsedKeywords.map((keyword) => keyword.toLowerCase()));
  const storyText = [
    primaryStory.context,
    ...primaryStory.actions,
    primaryStory.outcome ?? "",
    ...primaryStory.skills,
    secondaryStory?.context ?? "",
    ...(secondaryStory?.actions ?? []),
    secondaryStory?.outcome ?? "",
    ...(secondaryStory?.skills ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return SKILL_PRIORITY.filter(
    (skill) =>
      normalizedParsedSkills.has(skill) ||
      normalizedParsedKeywords.has(skill) ||
      normalizedProfileText.includes(skill.toLowerCase()) ||
      storyText.includes(skill.toLowerCase())
  )
    .slice(0, 6)
    .map(formatSkill);
}

function selectGrowthAreas(parsedJob: ParsedJob, parsedSkills: string[]) {
  const skillSet = new Set(parsedSkills.map((skill) => skill.toLowerCase()));
  const jobText = [...parsedJob.requirements, ...parsedJob.responsibilities]
    .join(" ")
    .toLowerCase();
  const growthAreas: string[] = [];

  if (jobText.includes("api") && !skillSet.has("api")) {
    growthAreas.push("APIs");
  }
  if (jobText.includes("postgresql") && !skillSet.has("postgresql")) {
    growthAreas.push("PostgreSQL");
  }
  if (jobText.includes("mysql") && !skillSet.has("mysql")) {
    growthAreas.push("MySQL");
  }
  if (jobText.includes("docker") && !skillSet.has("docker")) {
    growthAreas.push("Docker");
  }

  return dedupeStrings(growthAreas).slice(0, 2);
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

function normalizeCandidateHeaderLine(value: string, email = "") {
  const trimmed = value.trim();
  if (looksLikeSpacedUppercaseHeader(trimmed)) {
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

function looksLikeSpacedUppercaseHeader(value: string) {
  const collapsed = value.replace(/\s+/g, "");
  const tokens = value.split(/\s+/).filter(Boolean);

  return (
    collapsed.length >= 8 &&
    /^[A-Z]+$/.test(collapsed) &&
    tokens.length >= 4 &&
    tokens.every((token) => /^[A-Z]{1,3}$/.test(token))
  );
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
