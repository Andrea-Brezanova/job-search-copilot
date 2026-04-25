// This file generates the application package used by the workspace.
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import { generatedApplicationContentJsonSchema } from "@/lib/llm/schemas";
import type {
  ApplicationDocs,
  ApplicationPackage,
  ApplicationQualityNotes,
  GeneratedApplicationContent,
  ParsedJob,
  ParsedProfile
} from "@/lib/types";
import { analyzeParsedJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";

type ResumeExperience = {
  title: string;
  organization: string;
  summary: string;
  skillsUsed: string[];
  outcome?: string;
};

type SelectedResumeEvidence = {
  primaryExperience?: ResumeExperience;
  secondaryExperience?: ResumeExperience;
  supportedSkills: string[];
  growthAreas: string[];
  factsUsedFromResume: string[];
};

type ProfileContact = {
  name?: string;
  email?: string;
  phone?: string;
};

const APPROVED_ZOOM_CTA =
  "I’d be happy to talk through the role in more detail or walk through my Django project over a short Zoom call.";

const JOB_METADATA_PATTERN =
  /(remote|hybrid|onsite|full[- ]time|part[- ]time|reposted|promoted|clicked apply|actively reviewing|no longer accepting|applicants?|location|berlin,\s*berlin|germany)/i;

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
  const totalStartedAt = Date.now();
  const parseStartedAt = Date.now();
  const profile = await parseProfileText(profileText);
  const job = parseJobText(jobDescription);
  console.log("application-package-parse-ms", Date.now() - parseStartedAt);

  const fitStartedAt = Date.now();
  const fit = analyzeParsedJobFit(profile, job);
  console.log("application-package-fit-ms", Date.now() - fitStartedAt);
  const evidence = selectResumeEvidence(profileText, profile, job);
  const contact = extractProfileContact(profileText);
  const sanitizedJob = sanitizeJobContext(job);
  console.log("application-package-llm-call-count", 1);
  const llmContent = await generateApplicationContent(
    profileText,
    sanitizedJob,
    evidence,
    profile,
    contact
  );
  const documents =
    llmContent?.documents ??
    buildFallbackApplicationDocs(profile, sanitizedJob, evidence, contact);
  console.log("application-package-total-ms", Date.now() - totalStartedAt);

  return {
    documents,
    fitAnalysis: fit,
    parsedJob: sanitizedJob,
    applicationSummary:
      llmContent?.applicationSummary ??
      buildApplicationSummary(sanitizedJob, fit, evidence),
    qualityNotes: buildQualityNotes(job, evidence)
  };
}

function selectResumeEvidence(
  profileText: string,
  profile: ParsedProfile,
  job: ParsedJob
): SelectedResumeEvidence {
  const experiences = extractResumeExperiences(profileText, profile, job);
  const [primaryExperience, secondaryExperience] = experiences.slice(0, 2);
  const experienceSkills = experiences.flatMap((experience) => experience.skillsUsed);
  const supportedSkills = Array.from(
    new Set([...profile.skills, ...experienceSkills])
  ).slice(0, 7);
  const growthAreas = selectGrowthAreas(profile, job, supportedSkills);
  const factsUsedFromResume = [
    primaryExperience?.summary,
    secondaryExperience?.summary,
    ...profile.highlights
  ]
    .filter((fact): fact is string => Boolean(fact))
    .slice(0, 4);

  return {
    primaryExperience,
    secondaryExperience,
    supportedSkills,
    growthAreas,
    factsUsedFromResume
  };
}

function extractResumeExperiences(
  profileText: string,
  profile: ParsedProfile,
  job: ParsedJob
): ResumeExperience[] {
  const blocks = profileText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 30);

  const jobContextTokens = extractContextTokens([
    job.title,
    ...job.responsibilities,
    ...job.requirements,
    ...job.keywords
  ]);

  const experiences = blocks
    .map((block) => buildResumeExperience(block, profile, jobContextTokens))
    .filter((experience): experience is ResumeExperience => Boolean(experience));

  return experiences.sort((left, right) => {
    const leftScore = scoreExperience(left, jobContextTokens);
    const rightScore = scoreExperience(right, jobContextTokens);
    return rightScore - leftScore;
  });
}

function buildResumeExperience(
  block: string,
  profile: ParsedProfile,
  jobContextTokens: string[]
): ResumeExperience | null {
  const lines = block
    .split("\n")
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0 || looksLikeContactBlock(lines)) {
    return null;
  }

  const heading = lines[0];
  const title = extractExperienceTitle(heading);
  const organization = extractExperienceOrganization(lines);
  const summarySource = lines.find((line, index) => index > 0 && !looksLikeMetadataLine(line));
  const summary =
    summarySource ??
    lines.find((line) => /(built|designed|developed|implemented|supported|worked|validated|managed)/i.test(line)) ??
    block.slice(0, 180);

  if (!title && !organization && !summary) {
    return null;
  }

  const blockSkillCandidates = Array.from(
    new Set([...profile.skills, ...jobContextTokens])
  );
  const normalizedBlock = block.toLowerCase();
  const skillsUsed = blockSkillCandidates.filter((skill) =>
    normalizedBlock.includes(skill.toLowerCase())
  );
  const outcome = lines.find((line) =>
    /(reduced|improved|streamlined|increased|optimized|deployed|launched)/i.test(line)
  );

  return {
    title: title || "a recent role",
    organization: organization || "",
    summary: cleanSummary(summary),
    skillsUsed: skillsUsed.slice(0, 4),
    outcome: outcome ? cleanSummary(outcome) : undefined
  };
}

async function generateApplicationContent(
  profileText: string,
  job: ParsedJob,
  evidence: SelectedResumeEvidence,
  profile: ParsedProfile,
  contact: ProfileContact
) {
  const llmInput = buildGenerationInput(
    profileText,
    job,
    evidence,
    profile,
    contact
  );
  const startedAt = Date.now();
  const llmResult = await generateStructuredOutput<GeneratedApplicationContent>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: llmInput,
    outputType: "json",
    jsonSchema: generatedApplicationContentJsonSchema
  });
  console.log(
    "application-section-generation-ms",
    Date.now() - startedAt
  );

  if (!llmResult?.cover_letter?.trim() || !llmResult.email_text?.trim()) {
    return null;
  }

  return {
    documents: {
      coverLetter: finalizeCoverLetter(
        llmResult.cover_letter.trim(),
        job,
        contact
      ),
      applicationEmail: appendEmailSignatureIfMissing(
        finalizeApplicationEmail(llmResult.email_text.trim(), job),
        contact
      )
    },
    applicationSummary: llmResult.application_summary?.trim()
  };
}

function buildFallbackApplicationDocs(
  profile: ParsedProfile,
  job: ParsedJob,
  evidence: SelectedResumeEvidence,
  contact: ProfileContact
): ApplicationDocs {
  const greeting = job.company
    ? `Dear ${job.company} Hiring Team,`
    : "Dear Hiring Team,";
  const opening = buildOpeningLine(job);
  const primaryParagraph = buildExperienceParagraph(
    evidence.primaryExperience,
    "During my work"
  );
  const fallbackParagraph = !primaryParagraph
    ? buildProfileSummaryParagraph(profile)
    : "";
  const secondaryParagraph = buildSecondaryParagraph(evidence.secondaryExperience);
  const skillsParagraph = buildSkillsParagraph(profile, evidence);
  const closing = buildClosingParagraph();
  const signature = buildSignature(contact);

  const coverLetterSections = [
    greeting,
    opening,
    primaryParagraph,
    fallbackParagraph,
    secondaryParagraph,
    skillsParagraph,
    closing,
    signature
  ].filter(Boolean);

  return {
    coverLetter: coverLetterSections.join("\n\n"),
    applicationEmail: buildApplicationEmail(job, evidence, contact)
  };
}

function buildOpeningLine(job: ParsedJob) {
  const role = job.title?.trim() || "this role";
  const responsibilities = selectOpeningResponsibilities(job);

  if (responsibilities.length === 0) {
    return `I’m applying for the ${role} because it matches the kind of work I want to keep building on.`;
  }

  return `I’m applying for the ${role} because it matches the kind of work I want to keep building on: ${formatList(
    responsibilities
  )}.`;
}

function buildExperienceParagraph(
  experience: ResumeExperience | undefined,
  intro: string
) {
  if (!experience) {
    return "";
  }

  const title = experience.title || "a recent role";
  const organization = experience.organization
    ? ` at ${experience.organization}`
    : "";
  const summary = toFirstPersonSentence(experience.summary);
  const skillsSentence =
    experience.skillsUsed.length > 0
      ? ` This helped me build experience with ${formatList(experience.skillsUsed)}.`
      : "";

  return `${intro} as ${title}${organization}, ${summary}${skillsSentence}`;
}

function buildSecondaryParagraph(experience?: ResumeExperience) {
  if (!experience) {
    return "";
  }

  const title = experience.title || "another role";
  const organization = experience.organization
    ? ` at ${experience.organization}`
    : "";
  const summary = toFirstPersonSentence(experience.summary);
  const transferableSkill = chooseTransferableSkill(experience);
  const transferableSentence = transferableSkill
    ? ` This strengthened my ${transferableSkill}.`
    : "";

  return `Earlier, as ${title}${organization}, ${summary}${transferableSentence}`;
}

function buildSkillsParagraph(
  profile: ParsedProfile,
  evidence: SelectedResumeEvidence
) {
  const supportedSkills = evidence.supportedSkills.length > 0
    ? evidence.supportedSkills
    : profile.skills;
  const supportedSkillsSentence =
    supportedSkills.length > 0
      ? `I’m comfortable with ${formatList(supportedSkills)}.`
      : `I’m comfortable building on the mix of technical and problem-solving skills reflected in my resume.`;
  const growthAreasSentence =
    evidence.growthAreas.length > 0
      ? ` I’m especially interested in deepening my experience with ${formatList(
          evidence.growthAreas
        )}.`
      : "";

  return `${supportedSkillsSentence}${growthAreasSentence} I also use AI-assisted development tools as a learning and productivity aid, while making sure I understand and can explain the code I work on.`;
}

function buildProfileSummaryParagraph(profile: ParsedProfile) {
  const summary = cleanSummary(profile.summary);

  if (!summary) {
    return "";
  }

  return `My background includes ${lowercaseFirst(summary)}.`;
}

function buildClosingParagraph() {
  return "I’d be happy to talk through the role or walk through a relevant project in more detail over a short Zoom call.";
}

function buildApplicationEmail(
  job: ParsedJob,
  evidence: SelectedResumeEvidence,
  contact: ProfileContact
) {
  const role = job.title?.trim() || "this role";
  const greeting = job.company ? `Hello ${job.company} Hiring Team,` : "Hello,";
  const strongestEvidence =
    evidence.primaryExperience?.summary ||
    evidence.factsUsedFromResume[0] ||
    "My background includes relevant development and problem-solving experience.";
  const signatureName = contact.name || "Your Name";

  return [
    `Subject: Application for ${role}`,
    "",
    greeting,
    "",
    `I’m applying for the ${role}. ${toSentence(cleanSummary(strongestEvidence))}`,
    evidence.growthAreas.length > 0
      ? `I’m especially interested in continuing to grow in ${formatList(
          evidence.growthAreas
        )} while contributing where my current experience is strongest.`
      : "I’d welcome the chance to discuss how my background could support your team.",
    "",
    "Best regards,",
    signatureName
  ].join("\n");
}

function buildApplicationSummary(
  job: ParsedJob,
  fit: { fitScore: number },
  evidence: SelectedResumeEvidence
) {
  const role = job.title?.trim() || "this role";
  const evidenceSummary =
    evidence.primaryExperience?.title ||
    evidence.primaryExperience?.summary ||
    evidence.factsUsedFromResume[0] ||
    "the candidate's resume highlights";

  return `Generated a tailored application package for the ${role} role using ${evidenceSummary}. Current fit score: ${fit.fitScore}.`;
}

function buildGenerationInput(
  profileText: string,
  job: ParsedJob,
  evidence: SelectedResumeEvidence,
  profile: ParsedProfile,
  contact: ProfileContact
) {
  return [
    `EXTRACTED COMPANY: ${job.company ?? ""}`,
    `EXTRACTED ROLE: ${job.title || "this role"}`,
    `KEY RESPONSIBILITIES: ${sanitizeResponsibilities(job.responsibilities).slice(0, 3).join(" | ")}`,
    `SUPPORTED RESUME SKILLS: ${sanitizeSupportedSkills(evidence.supportedSkills).slice(0, 6).join(", ")}`,
    `GROWTH AREAS: ${sanitizeGrowthAreas(evidence.growthAreas).slice(0, 2).join(", ")}`,
    `RESUME HIGHLIGHTS: ${evidence.factsUsedFromResume.slice(0, 3).join(" | ")}`,
    `PROFILE SUMMARY: ${profile.summary}`,
    `CANDIDATE EMAIL: ${contact.email ?? ""}`,
    `CANDIDATE NAME: ${contact.name ?? ""}`,
    `RESUME CONTEXT: ${buildResumePromptContext(profileText, evidence.factsUsedFromResume)}`
  ].join("\n\n");
}

function buildQualityNotes(
  job: ParsedJob,
  evidence: SelectedResumeEvidence
): ApplicationQualityNotes {
  return {
    factsUsedFromResume: evidence.factsUsedFromResume,
    jobRequirementsAddressed: job.requirements.slice(0, 3),
    growthAreasPhrasedCarefully: evidence.growthAreas
  };
}

function extractProfileContact(profileText: string): ProfileContact {
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email = profileText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone =
    profileText.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s{2,}/g, " ").trim();
  const nameLine = lines.find(
    (line) =>
      !line.includes("@") &&
      !/\d/.test(line) &&
      /^[A-Za-z][A-Za-z\s'-]{3,40}$/.test(line) &&
      line.split(/\s+/).length >= 2
  );
  const normalizedName = nameLine ? normalizePersonName(nameLine, email) : undefined;
  const fallbackName = deriveNameFromEmail(email);

  return {
    name: normalizedName && !looksLikeBrokenName(normalizedName)
      ? normalizedName
      : fallbackName,
    email,
    phone
  };
}

function sanitizeJobContext(job: ParsedJob): ParsedJob {
  const company = isValidCompanyName(job.company) ? job.company?.trim() : undefined;
  const title = isValidRoleTitle(job.title) ? job.title.trim() : "this role";

  return {
    ...job,
    title,
    company,
    responsibilities: sanitizeResponsibilities(job.responsibilities),
    requirements: sanitizeGrowthAreas(job.requirements).slice(0, 6),
    keywords: sanitizeSupportedSkills(job.keywords).slice(0, 8)
  };
}

function isValidCompanyName(company?: string) {
  if (!company) {
    return false;
  }

  const normalized = company.trim();

  if (!normalized || normalized.length > 80) {
    return false;
  }

  return !JOB_METADATA_PATTERN.test(normalized);
}

function isValidRoleTitle(title?: string) {
  if (!title) {
    return false;
  }

  const normalized = title.trim();
  return (
    normalized.length > 0 &&
    normalized.length < 120 &&
    !JOB_METADATA_PATTERN.test(normalized)
  );
}

function buildSignature(contact: ProfileContact) {
  const lines = [
    "Best regards,",
    contact.name || "[Your Name]",
    contact.phone,
    contact.email
  ].filter(Boolean);

  return lines.join("\n");
}

function appendSignatureIfMissing(text: string, contact: ProfileContact) {
  const signature = buildSignature(contact);

  if (!signature || text.includes(signature)) {
    return text;
  }

  const normalizedText = text.trim();
  const hasRealSignoff = /(?:best regards|kind regards|sincerely),?\s*\n/i.test(
    normalizedText
  );

  if (hasRealSignoff) {
    return normalizedText;
  }

  return `${normalizedText}\n\n${signature}`;
}

function appendEmailSignatureIfMissing(text: string, contact: ProfileContact) {
  const normalizedText = text.trim();
  const signatureName = contact.name || "Your Name";

  if (normalizedText.includes(signatureName)) {
    return normalizedText;
  }

  return `${normalizedText}\n\nBest regards,\n${signatureName}`;
}

function selectOpeningResponsibilities(job: ParsedJob) {
  return job.responsibilities
    .map((responsibility) => simplifyResponsibility(responsibility))
    .filter(Boolean)
    .slice(0, 2);
}

function simplifyResponsibility(responsibility: string) {
  const cleaned = responsibility
    .replace(/^[•*-]\s*/, "")
    .replace(/\.$/, "")
    .trim();

  if (!cleaned) {
    return "";
  }

  return lowercaseFirst(cleaned);
}

function selectGrowthAreas(
  profile: ParsedProfile,
  job: ParsedJob,
  supportedSkills: string[]
) {
  const profileTokens = new Set(
    [...profile.skills, ...profile.keywords, ...supportedSkills].map((item) =>
      item.toLowerCase()
    )
  );

  return job.requirements
    .map((requirement) => cleanGrowthArea(requirement))
    .filter((requirement) => requirement.length > 0)
    .filter((requirement) => {
      const requirementTokens = requirement
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length > 2);

      return requirementTokens.every((token) => !profileTokens.has(token));
    })
    .slice(0, 2);
}

function cleanGrowthArea(requirement: string) {
  return requirement
    .replace(/^[•*-]\s*/, "")
    .replace(/^(required|preferred|must have|qualifications?)[:\s-]*/i, "")
    .replace(/^(experience with|familiarity with)\s+/i, "")
    .replace(/\.$/, "")
    .trim();
}

function scoreExperience(experience: ResumeExperience, jobContextTokens: string[]) {
  const experienceText = [
    experience.title,
    experience.organization,
    experience.summary,
    ...experience.skillsUsed
  ]
    .join(" ")
    .toLowerCase();

  return jobContextTokens.reduce((score, token) => {
    return experienceText.includes(token) ? score + 1 : score;
  }, 0);
}

function chooseTransferableSkill(experience: ResumeExperience) {
  if (experience.skillsUsed.length > 0) {
    return formatList(experience.skillsUsed.slice(0, 2));
  }

  const summary = experience.summary.toLowerCase();

  if (summary.includes("debug")) {
    return "debugging and problem solving";
  }

  if (summary.includes("data")) {
    return "attention to data correctness";
  }

  return "communication and problem solving";
}

function extractExperienceTitle(heading: string) {
  const parts = heading
    .split(/[|@,-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const likelyTitle = parts.find((part) =>
    /(engineer|developer|analyst|intern|specialist|manager|support|designer|consultant|assistant)/i.test(
      part
    )
  );

  return likelyTitle || parts[0] || "";
}

function extractExperienceOrganization(lines: string[]) {
  const candidate = lines
    .slice(0, 3)
    .find(
      (line) =>
        !looksLikeMetadataLine(line) &&
        !/(engineer|developer|analyst|intern|specialist|manager|support|designer|consultant|assistant)/i.test(
          line
        ) &&
        line.length < 80
    );

  return candidate || "";
}

function looksLikeMetadataLine(line: string) {
  return /\b(20\d{2}|19\d{2}|present|remote|full[- ]time|part[- ]time)\b/i.test(line);
}

function looksLikeContactBlock(lines: string[]) {
  const joined = lines.join(" ");
  return joined.includes("@") || /linkedin|github/i.test(joined);
}

function cleanSummary(summary: string) {
  return summary.replace(/^[•*-]\s*/, "").replace(/\s+/g, " ").trim();
}

function toFirstPersonSentence(text: string) {
  const normalized = cleanSummary(text).replace(/\.$/, "");

  if (/^i\s/i.test(normalized)) {
    return toSentence(normalized);
  }

  if (/^(worked|built|designed|developed|implemented|supported|validated|created|managed|improved|deployed)/i.test(normalized)) {
    return toSentence(`I ${lowercaseFirst(normalized)}`);
  }

  return toSentence(`I worked on ${lowercaseFirst(normalized)}`);
}

function toSentence(text: string) {
  const trimmed = text.trim();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function formatList(items: string[]) {
  const cleanedItems = Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

  if (cleanedItems.length === 0) {
    return "";
  }

  if (cleanedItems.length === 1) {
    return cleanedItems[0];
  }

  if (cleanedItems.length === 2) {
    return `${cleanedItems[0]} and ${cleanedItems[1]}`;
  }

  return `${cleanedItems.slice(0, -1).join(", ")}, and ${
    cleanedItems[cleanedItems.length - 1]
  }`;
}

function lowercaseFirst(value: string) {
  return value.length > 0
    ? `${value.charAt(0).toLowerCase()}${value.slice(1)}`
    : value;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePersonName(value: string, email?: string) {
  const trimmed = value.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const shortTokenCount = tokens.filter((token) => token.length <= 2).length;

  if (tokens.length >= 4 && shortTokenCount >= Math.ceil(tokens.length * 0.6)) {
    const joined = tokens.join("").replace(/[^A-Za-z'-]/g, "");
    const emailFirstName = deriveNameFromEmail(email)?.split(/\s+/)[0]?.toLowerCase();

    if (emailFirstName && joined.toLowerCase().startsWith(emailFirstName)) {
      const remaining = joined.slice(emailFirstName.length);

      if (remaining.length >= 2) {
        return `${toTitleCase(emailFirstName)} ${toTitleCase(remaining)}`;
      }
    }

    return toTitleCase(joined);
  }

  return toTitleCase(trimmed.replace(/\s+/g, " "));
}

function deriveNameFromEmail(email?: string) {
  if (!email) {
    return undefined;
  }

  const localPart = email.split("@")[0]?.trim();

  if (!localPart) {
    return undefined;
  }

  const pieces = localPart
    .split(/[._-]+/)
    .map((piece) => piece.replace(/[^A-Za-z]/g, "").trim())
    .filter((piece) => piece.length >= 2);

  if (pieces.length === 0) {
    return undefined;
  }

  return pieces.map((piece) => toTitleCase(piece)).join(" ");
}

function looksLikeBrokenName(name: string) {
  return (
    /[A-Z][a-z]+[A-Z][a-z]+/.test(name.replace(/\s+/g, "")) ||
    name.split(/\s+/).some((part) => part.length === 1)
  );
}

function extractContextTokens(values: string[]) {
  return Array.from(
    new Set(
      values
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9\s.+#-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 3)
    )
  );
}

function trimForPrompt(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function sanitizeResponsibilities(responsibilities: string[]) {
  return responsibilities
    .map((item) => item.replace(/^[•*-]\s*/, "").trim())
    .filter((item) => item.length > 0)
    .filter((item) => !JOB_METADATA_PATTERN.test(item))
    .filter((item) => !/about the role|about the job|job description/i.test(item))
    .slice(0, 3);
}

function sanitizeSupportedSkills(skills: string[]) {
  return Array.from(
    new Set(
      skills
        .map((skill) => skill.trim())
        .filter(Boolean)
        .filter((skill) => skill.length < 40)
        .filter((skill) => !JOB_METADATA_PATTERN.test(skill))
        .filter((skill) => !/required|preferred|qualification|responsibilit/i.test(skill))
    )
  );
}

function sanitizeGrowthAreas(growthAreas: string[]) {
  return Array.from(
    new Set(
      growthAreas
        .map((area) =>
          area
            .replace(/^[•*-]\s*/, "")
            .replace(/^(required|preferred|qualifications?|responsibilities?)[:\s-]*/i, "")
            .trim()
        )
        .filter(Boolean)
        .filter((area) => !JOB_METADATA_PATTERN.test(area))
        .filter((area) => area.length < 80)
    )
  ).slice(0, 2);
}

function buildResumePromptContext(profileText: string, highlights: string[]) {
  const joinedHighlights = highlights.filter(Boolean).join(" | ");

  if (joinedHighlights) {
    return trimForPrompt(joinedHighlights, 700);
  }

  return trimForPrompt(profileText, 700);
}

function finalizeCoverLetter(
  text: string,
  job: ParsedJob,
  contact: ProfileContact
) {
  const cleanupStartedAt = Date.now();
  let result = appendSignatureIfMissing(text, contact);

  const metadataStartedAt = Date.now();
  result = stripJobMetadataLines(result);
  console.log("cleanupMetadataDuration", Date.now() - metadataStartedAt);

  const roleStartedAt = Date.now();
  result = enforceExactRole(result, job.title);
  if (!containsExactRole(result, job.title)) {
    result = replaceOpeningWithExactRole(result, job);
  }
  console.log("cleanupRoleDuration", Date.now() - roleStartedAt);

  const ctaStartedAt = Date.now();
  result = enforceApprovedZoomCta(result);
  console.log("cleanupCtaDuration", Date.now() - ctaStartedAt);

  result = trimSkillListInLetter(result);
  result = limitCoverLetterWords(result, 230);
  result = normalizeGeneratedText(result);
  console.log("cleanupTotalDuration", Date.now() - cleanupStartedAt);

  return result;
}

function finalizeApplicationEmail(text: string, job: ParsedJob) {
  let result = stripJobMetadataLines(text);
  result = enforceExactRole(result, job.title);

  if (!containsZoom(result)) {
    result = `${result.trim()}\n\nI’d welcome a short Zoom call to discuss fit.`;
  }

  return normalizeGeneratedText(limitEmailWords(result, 110));
}

function stripJobMetadataLines(text: string) {
  return text
    .split("\n")
    .filter((line) => !JOB_METADATA_PATTERN.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function containsExactRole(text: string, role: string) {
  if (!role || role === "this role") {
    return true;
  }

  return text.includes(role);
}

function enforceExactRole(text: string, role: string) {
  if (!role || role === "this role" || text.includes(role)) {
    return text;
  }

  const generalizedRole = role
    .replace(/\bJunior\s+/i, "")
    .replace(/\bSenior\s+/i, "")
    .trim();

  if (generalizedRole && text.includes(generalizedRole)) {
    return text.replace(generalizedRole, role);
  }

  return text;
}

function replaceOpeningWithExactRole(text: string, job: ParsedJob) {
  const paragraphs = text.split("\n\n");
  const greetingIndex = paragraphs[0]?.startsWith("Dear ") ? 1 : 0;
  const responsibilities = sanitizeResponsibilities(job.responsibilities);
  const opening =
    responsibilities.length > 0
      ? `I’m applying for the ${job.title} because it matches the kind of work I want to keep building on: ${formatList(
          responsibilities
        )}.`
      : `I’m applying for the ${job.title} because it matches the kind of work I want to keep building on.`;

  if (paragraphs[greetingIndex]) {
    paragraphs[greetingIndex] = opening;
    return paragraphs.join("\n\n");
  }

  return text;
}

function enforceApprovedZoomCta(text: string) {
  const paragraphs = text.split("\n\n").filter(Boolean);
  const dedupedParagraphs = paragraphs.filter((paragraph, index) => {
    const normalizedParagraph = paragraph.trim();

    if (normalizedParagraph !== APPROVED_ZOOM_CTA) {
      return true;
    }

    return (
      index === paragraphs.findIndex((candidate) => candidate.trim() === APPROVED_ZOOM_CTA)
    );
  });
  const signatureStart = paragraphs.findIndex((paragraph) =>
    /best regards|sincerely|kind regards/i.test(paragraph)
  );
  const workingParagraphs = dedupedParagraphs;
  const workingSignatureStart = workingParagraphs.findIndex((paragraph) =>
    /best regards|sincerely|kind regards/i.test(paragraph)
  );
  const insertIndex =
    workingSignatureStart > 0
      ? workingSignatureStart - 1
      : workingParagraphs.length - 1;

  if (insertIndex >= 0) {
    workingParagraphs[insertIndex] = APPROVED_ZOOM_CTA;
  } else {
    workingParagraphs.push(APPROVED_ZOOM_CTA);
  }

  return workingParagraphs.join("\n\n");
}

function containsZoom(text: string) {
  return /zoom/i.test(text);
}

function trimSkillListInLetter(text: string) {
  return text.replace(
    /(I[’']?m comfortable with\s+)([^.]+)\./i,
    (_, prefix: string, skills: string) => {
      const trimmedSkills = sanitizeSupportedSkills(skills.split(",")).slice(0, 5);
      return `${prefix}${formatList(trimmedSkills)}.`;
    }
  );
}

function limitCoverLetterWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  const signatureMatch = text.match(/\n\n(Best regards,[\s\S]*)$/);
  const signature = signatureMatch?.[1] ?? "";
  const body = signature ? text.replace(/\n\n(Best regards,[\s\S]*)$/, "") : text;
  const paragraphs = body.split("\n\n").filter(Boolean);

  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    if (
      !/Dear |I’m applying|Best regards|Sincerely|Kind regards/i.test(paragraphs[index]) &&
      countWords(`${paragraphs.join("\n\n")}${signature ? `\n\n${signature}` : ""}`) > maxWords
    ) {
      paragraphs.splice(index, 1);
    }
  }

  const trimmedBody = paragraphs.join("\n\n");
  return signature ? `${trimmedBody}\n\n${signature}` : trimmedBody;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function limitEmailWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  const lines = text.split("\n").filter(Boolean);
  const trimmedLines = lines.filter((line) => !/^I’d welcome a short Zoom call/i.test(line));
  const trimmedText = trimmedLines.join("\n");

  if (countWords(trimmedText) <= maxWords) {
    return trimmedText;
  }

  return words.slice(0, maxWords).join(" ");
}

function normalizeGeneratedText(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
