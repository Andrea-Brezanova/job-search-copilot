// This file generates the application package used by the workspace.
import { analyzeParsedJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import { generateApplicationContentJsonSchema } from "@/lib/llm/schemas";
import type {
  ApplicationDocs,
  ApplicationPackage,
  ApplicationQualityNotes,
  ExperienceEvidenceCard,
  GeneratedApplicationContent,
  ParsedJob,
  ParsedProfile,
} from "@/lib/types";

type ProfileContact = {
  name?: string;
  email?: string;
  phone?: string;
};

type GenerationPayload = {
  resumeText: string;
  jobDescriptionText: string;
  requestedOutputs: Array<"cover_letter" | "email_text">;
  tone: string;
  parsedRole: string;
  parsedCompany?: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  supportedSkills: string[];
  growthAreas: string[];
  primaryStory: ExperienceEvidenceCard;
  secondaryStory?: ExperienceEvidenceCard;
};

type CoverLetterInputDebug = {
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

type GenerationValidationResult = {
  ok: boolean;
  failedField?: "candidateName" | "primaryStory" | "supportedSkills" | "role" | "jobDescription";
  reason?: string;
};

type ExperienceParseResult = {
  detectedSections: string[];
  rawExperienceBlocks: string[];
  experiences: ExperienceEvidenceCard[];
};

type ScoredExperienceBlock = {
  experience: ExperienceEvidenceCard;
  score: number;
};

const EMAIL_CTA_QUESTION =
  "Would you be available for a short Zoom call this week to discuss the role?";

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
  const parsedProfile = await parseProfileText(profileText);
  const parsedJob = parseJobText(jobDescription);
  const contact = extractProfileContact(profileText);
  console.log("application-package-parse-ms", Date.now() - parseStartedAt);
  console.log("parsedCandidateName", parsedProfile.name || "");

  const fitStartedAt = Date.now();
  const fitAnalysis = analyzeParsedJobFit(parsedProfile, parsedJob);
  console.log("application-package-fit-ms", Date.now() - fitStartedAt);

  const payloadStartedAt = Date.now();
  console.log("parsedProfile", JSON.stringify(parsedProfile, null, 2));
  const experienceParseResult = extractResumeExperiences(profileText);
  const extractedExperiences = experienceParseResult.experiences;
  console.log("resumeTextLength", profileText.length);
  console.log("detectedSections", JSON.stringify(experienceParseResult.detectedSections, null, 2));
  console.log("rawExperienceBlocks", JSON.stringify(experienceParseResult.rawExperienceBlocks, null, 2));
  const selectedPrimaryStory = selectPrimaryStory(extractedExperiences, parsedJob, profileText);
  const selectedSecondaryStory = selectSecondaryStory(
    extractedExperiences,
    selectedPrimaryStory
  );
  console.log("extractedExperiences", JSON.stringify(extractedExperiences, null, 2));
  console.log("selectedPrimaryStory", JSON.stringify(selectedPrimaryStory ?? null, null, 2));
  console.log("selectedSecondaryStory", JSON.stringify(selectedSecondaryStory ?? null, null, 2));

  if (!selectedPrimaryStory) {
    throw new Error(
      "Could not extract enough resume evidence to generate a cover letter."
    );
  }

  const generationPayload = buildGenerationPayload(
    profileText,
    jobDescription,
    parsedProfile,
    parsedJob,
    contact,
    selectedPrimaryStory,
    selectedSecondaryStory
  );
  console.log("application-package-evidence-ms", Date.now() - payloadStartedAt);
  console.log("supportedSkills", JSON.stringify(generationPayload.supportedSkills, null, 2));
  console.log("growthAreas", JSON.stringify(generationPayload.growthAreas, null, 2));
  const coverLetterInputDebug = buildCoverLetterInputDebug(generationPayload);
  console.log(
    "application-package-cover-letter-input",
    JSON.stringify(coverLetterInputDebug, null, 2)
  );
  const validation = validateGenerationPayload(generationPayload);
  if (!validation.ok) {
    console.log(
      "generationValidationFailed",
      JSON.stringify(
        {
          failedField: validation.failedField ?? "",
          reason: validation.reason ?? "",
          candidateName: generationPayload.candidateName,
          parsedRole: generationPayload.parsedRole,
          parsedCompany: generationPayload.parsedCompany ?? "",
          supportedSkills: generationPayload.supportedSkills,
          growthAreas: generationPayload.growthAreas,
          primaryStory: generationPayload.primaryStory ?? null,
          secondaryStory: generationPayload.secondaryStory ?? null,
          jobDescriptionPreview: generationPayload.jobDescriptionText
            .split("\n")
            .filter(Boolean)
            .slice(0, 8),
        },
        null,
        2
      )
    );
    throw new Error(
      validation.reason ||
        `Could not extract enough resume evidence to generate a cover letter. Failed field: ${validation.failedField}`
    );
  }

  console.log("application-package-llm-call-count", 1);
  const llmStartedAt = Date.now();
  const llmResult = await generateStructuredOutput<GeneratedApplicationContent>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: JSON.stringify({ generationPayload }, null, 2),
    outputType: "json",
    jsonSchema: generateApplicationContentJsonSchema,
  });
  console.log("application-section-generation-ms", Date.now() - llmStartedAt);

  const fallbackUsed =
    !llmResult?.data?.cover_letter?.trim() || !llmResult.data.email_text?.trim();

  if (fallbackUsed) {
    console.log(
      "application-package-debug",
      JSON.stringify(
        {
          wasOpenAIUsed: llmResult?.wasOpenAIUsed ?? false,
          model: llmResult?.model ?? "",
          rawOpenAIResponse: llmResult?.rawOutputText ?? "",
          finalCleanedCoverLetter: "",
          candidateName: generationPayload.candidateName,
          parsedRole: generationPayload.parsedRole,
          parsedCompany: generationPayload.parsedCompany ?? "",
          fallbackUsed: true,
          openAIError:
            llmResult?.error ??
            "OpenAI did not return usable cover letter/email content."
        },
        null,
        2
      )
    );
  }

  const cleanupStartedAt = Date.now();
  const documents = finalizeGeneratedDocuments(llmResult.data, generationPayload);
  console.log("cleanupTotalDuration", Date.now() - cleanupStartedAt);
  console.log(
    "application-package-debug",
    JSON.stringify(
      {
        wasOpenAIUsed: llmResult.wasOpenAIUsed,
        model: llmResult.model,
        rawOpenAIResponse: llmResult.rawOutputText,
        finalCleanedCoverLetter: documents.coverLetter,
        candidateName: generationPayload.candidateName,
        parsedRole: generationPayload.parsedRole,
        parsedCompany: generationPayload.parsedCompany ?? "",
        fallbackUsed,
        openAIError: llmResult.error ?? ""
      },
      null,
      2
    )
  );
  console.log("application-package-total-ms", Date.now() - totalStartedAt);

  return {
    documents,
    fitAnalysis,
    parsedJob,
    applicationSummary:
      llmResult.data?.application_summary?.trim() ||
      buildApplicationSummary(parsedProfile, generationPayload.parsedRole),
    qualityNotes: buildQualityNotes(generationPayload),
  };
}

function buildGenerationPayload(
  profileText: string,
  jobDescription: string,
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob,
  contact: ProfileContact,
  primaryStory: ExperienceEvidenceCard,
  secondaryStory?: ExperienceEvidenceCard
): GenerationPayload {
  const candidateName = resolveCandidateName(
    parsedProfile.name,
    contact.name,
    contact.email,
    profileText
  );

  return {
    resumeText: cleanResumeText(profileText),
    jobDescriptionText: cleanJobDescriptionText(jobDescription, parsedJob),
    requestedOutputs: ["cover_letter", "email_text"],
    tone: "human, concise, professional",
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
  };
}

function buildCoverLetterInputDebug(
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

function validateGenerationPayload(
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

function finalizeGeneratedDocuments(
  generatedContent: GeneratedApplicationContent | null,
  payload: GenerationPayload
): ApplicationDocs {
  if (!generatedContent?.cover_letter?.trim() || !generatedContent.email_text?.trim()) {
    return {
      coverLetter: "Generation failed. Please try again.",
      applicationEmail: ""
    };
  }

  return {
    coverLetter: finalizeCoverLetter(generatedContent.cover_letter, payload),
    applicationEmail: finalizeEmail(generatedContent.email_text, payload),
  };
}

function finalizeCoverLetter(text: string, payload: GenerationPayload) {
  let result = normalizeGeneratedText(text);
  result = stripJobMetadata(result);
  result = ensureCoverLetterGreeting(result, payload);
  result = ensureRoleMention(result, payload.parsedRole);
  result = removeStandaloneSkillsParagraph(result);
  result = ensureCoverLetterSignature(result, payload);
  return normalizeTechnologyCapitalization(removeDuplicateLines(result));
}

function finalizeEmail(text: string, payload: GenerationPayload) {
  const greeting = buildEmailGreeting(payload.jobDescriptionText);
  const roleLine = `I’m applying for the ${ensureRoleHasRoleWord(payload.parsedRole)}.`;
  const attachmentLine =
    "I attach my Resume and Cover letter below for your consideration.";
  const body = [greeting, `${roleLine} ${attachmentLine}`, EMAIL_CTA_QUESTION]
    .filter(Boolean)
    .join("\n\n");

  return normalizeTechnologyCapitalization(
    ensureEmailSignature(cleanupEmailText(body), payload)
  );
}

function buildEmailGreeting(jobDescriptionText: string) {
  const contactName = extractContactPersonName(jobDescriptionText);
  return contactName ? `Dear ${contactName},` : "Dear Hiring Team,";
}

function extractContactPersonName(jobDescriptionText: string) {
  const lines = jobDescriptionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^(?:contact|hiring manager|recruiter|report to|reports to)[:\s-]+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,2})$/
    );
    const candidate = match?.[1]?.trim();
    if (candidate && isValidContactPersonName(candidate)) {
      return candidate;
    }
  }

  return "";
}

function isValidContactPersonName(value: string) {
  return (
    /^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,2}$/.test(value) &&
    !/hiring team|hiring manager|talent acquisition|human resources|recruiting team/i.test(
      value
    )
  );
}

function ensureCoverLetterGreeting(text: string, payload: GenerationPayload) {
  const greeting = payload.parsedCompany
    ? `Dear ${payload.parsedCompany} Hiring Team,`
    : "Dear Hiring Team,";
  const paragraphs = text.split("\n\n").filter(Boolean);

  if (paragraphs.length === 0) {
    return greeting;
  }

  if (/^dear\b/i.test(paragraphs[0])) {
    paragraphs[0] = greeting;
    return normalizeGeneratedText(paragraphs.join("\n\n"));
  }

  return `${greeting}\n\n${text}`;
}

function ensureRoleMention(text: string, role: string) {
  if (role === "this role" || text.includes(role)) {
    return text;
  }

  const paragraphs = text.split("\n\n").filter(Boolean);
  if (paragraphs.length < 2) {
    return text;
  }

  paragraphs[1] = `I’m applying for the ${ensureRoleHasRoleWord(role)} because it aligns with the kind of work I want to keep building on.`;
  return normalizeGeneratedText(paragraphs.join("\n\n"));
}

function ensureCoverLetterSignature(text: string, payload: GenerationPayload) {
  const signature = buildCoverLetterSignature(payload, text);
  const withoutExisting = normalizeGeneratedText(
    text
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return !(
          /^(best regards|sincerely),?$/i.test(trimmed) ||
          trimmed === payload.candidateName ||
          trimmed === payload.candidateEmail ||
          trimmed === payload.candidatePhone
        );
      })
      .join("\n")
  );

  return withoutExisting.endsWith(signature)
    ? withoutExisting
    : `${withoutExisting}\n\n${signature}`;
}

function ensureEmailSignature(text: string, payload: GenerationPayload) {
  const signature = buildEmailSignature(payload);
  const withoutExisting = normalizeGeneratedText(
    text
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return !(
          /^(best regards|sincerely),?$/i.test(trimmed) ||
          trimmed === payload.candidateName ||
          trimmed === payload.candidateEmail ||
          trimmed === payload.candidatePhone
        );
      })
      .join("\n")
  );

  return withoutExisting.endsWith(signature)
    ? withoutExisting
    : `${withoutExisting}\n\n${signature}`;
}

function buildCoverLetterSignature(payload: GenerationPayload, text: string) {
  const signoff = /\bsincerely,?\b/i.test(text) ? "Sincerely," : "Best regards,";
  return [signoff, payload.candidateName, payload.candidatePhone, payload.candidateEmail]
    .filter(Boolean)
    .join("\n");
}

function buildEmailSignature(payload: GenerationPayload) {
  return ["Best regards,", payload.candidateName, payload.candidateEmail]
    .filter(Boolean)
    .join("\n");
}

function buildApplicationSummary(parsedProfile: ParsedProfile, role: string) {
  const summary = parsedProfile.highlights[0] || parsedProfile.summary;
  return summary
    ? `Generated a tailored application package for the ${role}. ${summary}`
    : `Generated a tailored application package for the ${role}.`;
}

function buildQualityNotes(payload: GenerationPayload): ApplicationQualityNotes {
  return {
    factsUsedFromResume: payload.resumeText.split("\n").filter(Boolean).slice(0, 5),
    jobRequirementsAddressed: payload.jobDescriptionText
      .split("\n")
      .filter(Boolean)
      .slice(0, 5),
    growthAreasPhrasedCarefully: [],
  };
}

function extractProfileContact(profileText: string): ProfileContact {
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
    /^the role$/i.test(normalized) ||
    normalized.length > 80
  ) {
    return undefined;
  }

  return normalized;
}

function sanitizeRoleTitle(role?: string) {
  const normalized = role
    ?.replace(/\s*[|,-].*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!normalized || JOB_METADATA_PATTERN.test(normalized) || normalized.split(/\s+/).length > 8) {
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

function ensureRoleHasRoleWord(role: string) {
  const cleanedRole = role === "this role" ? "role" : role;
  return /\brole\b/i.test(cleanedRole) ? cleanedRole : `${cleanedRole} role`;
}

function removeStandaloneSkillsParagraph(text: string) {
  return text
    .split("\n\n")
    .filter(
      (paragraph) =>
        !/^(i work primarily with|i['’]m comfortable with|my main skills are|my background includes skills in)/i.test(
          paragraph.trim()
        )
    )
    .join("\n\n");
}

function stripJobMetadata(text: string) {
  return normalizeGeneratedText(
    text
      .split("\n")
      .filter((line) => !JOB_METADATA_PATTERN.test(line))
      .join("\n")
  );
}

function removeDuplicateLines(text: string) {
  const seen = new Set<string>();
  const cleanedParagraphs = text
    .split("\n\n")
    .filter(Boolean)
    .map((paragraph) => {
      if (
        /^(best regards|sincerely),?$/im.test(paragraph) ||
        /@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(paragraph)
      ) {
        return paragraph
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => {
            const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
            if (!normalized || seen.has(normalized)) {
              return false;
            }
            seen.add(normalized);
            return true;
          })
          .join("\n");
      }

      return paragraph
        .replace(/^[•*-]\s*/gm, "")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .filter((sentence) => {
          const normalized = sentence.toLowerCase().replace(/\s+/g, " ").trim();
          if (!normalized || seen.has(normalized)) {
            return false;
          }
          seen.add(normalized);
          return true;
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    })
    .filter(Boolean);

  return cleanedParagraphs.join("\n\n");
}

function normalizeGeneratedText(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").replace(/\.\./g, ".").trim();
}

function normalizeTechnologyCapitalization(text: string) {
  return text
    .replace(/\bpython\b/g, "Python")
    .replace(/\bdjango\b/g, "Django")
    .replace(/\bsql\b/g, "SQL")
    .replace(/\bdocker\b/g, "Docker")
    .replace(/\bgit\b/g, "Git")
    .replace(/\bjavascript\b/g, "JavaScript")
    .replace(/\btypescript\b/g, "TypeScript")
    .replace(/\bpostgresql\b/g, "PostgreSQL")
    .replace(/\bnode\.js\b/g, "Node.js");
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractResumeExperiences(profileText: string): ExperienceParseResult {
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
    console.log("rejectReason", JSON.stringify({ block, reason: "header-only block" }, null, 2));
    return null;
  }

  const lines = block
    .split("\n")
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !looksLikePureContactLine(line));

  if (lines.length === 0) {
    console.log("rejectReason", JSON.stringify({ block, reason: "empty after contact filtering" }, null, 2));
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
    console.log("rejectReason", JSON.stringify({ block, reason: "no substantial content lines" }, null, 2));
    return null;
  }

  const role = inferExperienceRole(headerParts, header, contentLines);
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
    console.log(
      "rejectReason",
      JSON.stringify({ block, reason: "missing verbs/technical/work keywords" }, null, 2)
    );
    return null;
  }

  if (actions.length === 0 && !context) {
    console.log("rejectReason", JSON.stringify({ block, reason: "no usable actions or context" }, null, 2));
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

function selectPrimaryStory(
  experiences: ExperienceEvidenceCard[],
  parsedJob: ParsedJob,
  profileText: string
) {
  const jobText = [
    parsedJob.title,
    ...parsedJob.responsibilities,
    ...parsedJob.requirements
  ]
    .join(" ")
    .toLowerCase();

  const scored: ScoredExperienceBlock[] = experiences
    .map((experience) => ({
      experience,
      score: scoreExperience(experience, jobText)
    }))
    .sort((left, right) => right.score - left.score);
  console.log("scoredExperienceBlocks", JSON.stringify(scored, null, 2));

  if (scored[0]?.score && scored[0].score > 0) {
    return scored[0].experience;
  }

  const completeExperience = experiences.find(isCompleteStory);
  if (completeExperience) {
    return completeExperience;
  }

  const detailedExperience = experiences
    .slice()
    .sort((left, right) => getExperienceDetailScore(right) - getExperienceDetailScore(left))[0];
  if (detailedExperience) {
    return detailedExperience;
  }

  return buildFallbackPrimaryStoryFromResume(profileText);
}

function selectSecondaryStory(
  experiences: ExperienceEvidenceCard[],
  primaryStory?: ExperienceEvidenceCard
) {
  return experiences.find(
    (experience) =>
      experience !== primaryStory &&
      /(sql|qa|validate|debug|collabor|support|documentation|customer|process)/i.test(
        [experience.context, ...experience.actions, experience.outcome ?? ""].join(" ")
      )
  );
}

function scoreExperience(experience: ExperienceEvidenceCard, jobText: string) {
  const text = [
    experience.role,
    experience.organization,
    experience.context,
    ...experience.actions,
    experience.outcome ?? "",
    ...experience.skills
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const token of [
    "python",
    "django",
    "sql",
    "database",
    "backend",
    "api",
    "analyst",
    "qa",
    "business",
    "data"
  ]) {
    if (text.includes(token) && jobText.includes(token)) {
      score += 3;
    }
  }

  if (/django|procurement|database|manual data entry|deployed/.test(text)) {
    score += 5;
  }

  if (/wayfair|qa|sql|validate|debug/.test(text)) {
    score += 4;
  }

  return score;
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

function isCompleteStory(story?: ExperienceEvidenceCard) {
  if (!story) {
    return false;
  }

  return Boolean(
    (story.role?.trim() || story.organization?.trim()) &&
      story.context?.trim() &&
      story.actions.length > 0
  );
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

function cleanupEmailText(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const cleanedLines: string[] = [];
  let seenCta = false;

  for (const line of lines) {
    if (/([A-Z]\s){3,}/.test(line)) {
      continue;
    }
    if (/^i am excited to apply/i.test(line)) {
      continue;
    }
    if (/^i['’]?ve attached my cover letter/i.test(line)) {
      continue;
    }
    if (/^could we schedule/i.test(line)) {
      continue;
    }
    if (/would you be available for a short zoom call/i.test(line)) {
      if (seenCta) {
        continue;
      }
      cleanedLines.push(EMAIL_CTA_QUESTION);
      seenCta = true;
      continue;
    }

    if (!/[.!?]$/.test(line) && !/^(hello hiring team,|dear .+,)$/i.test(line)) {
      continue;
    }

    cleanedLines.push(line);
  }

  if (!cleanedLines.some((line) => line === EMAIL_CTA_QUESTION)) {
    cleanedLines.push(EMAIL_CTA_QUESTION);
  }

  return cleanedLines.join("\n\n");
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

function inferExperienceRole(
  headerParts: string[],
  header: string,
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

function getExperienceDetailScore(experience: ExperienceEvidenceCard) {
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

function buildFallbackPrimaryStoryFromResume(profileText: string): ExperienceEvidenceCard | undefined {
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
