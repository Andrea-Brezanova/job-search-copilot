// This file generates the application package used by the workspace.
import { generateStructuredOutput } from "@/lib/llm/client";
import { generateApplicationContentJsonSchema } from "@/lib/llm/schemas";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import type {
  ApplicationDocs,
  ApplicationPackage,
  ApplicationQualityNotes,
  CoverLetterInput,
  ExperienceEvidenceCard,
  FitAnalysis,
  GeneratedApplicationContent,
  ParsedJob,
  ParsedProfile
} from "@/lib/types";
import { analyzeParsedJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";

type ProfileContact = {
  name?: string;
  email?: string;
};

const APPROVED_ZOOM_CTA =
  "I’d be happy to discuss the role in more detail or walk you through my Django project over a short Zoom call.";

const APPROVED_EMAIL_CTA_QUESTION =
  "Would you be available for a short Zoom call this week to discuss the role?";

const APPROVED_EMAIL_CTA_VALUE =
  "I’d be happy to walk you through my project and learn more about your team.";

const APPROVED_EMAIL_ATTACHMENT_LINE =
  "I’ve attached my cover letter and resume for your consideration.";

const JOB_METADATA_PATTERN =
  /(reposted|promoted|applicants?|clicked apply|actively reviewing|easy apply|matches your job preferences|hybrid|on-site|onsite|remote|full[- ]time|part[- ]time|contract|save\b|see how you compare|meet the hiring team|show more options)/i;

const ROLE_PATTERN =
  /(developer|engineer|analyst|intern|specialist|manager|consultant|qa|support)/i;

const ACTION_PATTERN =
  /(designed|developed|built|implemented|integrated|validated|debugged|deployed|streamlined|collaborated|worked|supported|documented|reduced|improved|managed|maintained)/i;

const OUTCOME_PATTERN =
  /(reduced|improved|streamlined|enabled|supported|validated|automated|deployed|made sure)/i;

const RESPONSIBILITY_THEME_FALLBACKS = [
  "building backend tools",
  "working with relational databases"
];

const SKILL_PRIORITY = [
  "python",
  "django",
  "sql",
  "postgresql",
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

  const fitStartedAt = Date.now();
  const fitAnalysis = analyzeParsedJobFit(parsedProfile, parsedJob);
  console.log("application-package-fit-ms", Date.now() - fitStartedAt);

  const evidenceStartedAt = Date.now();
  const evidenceCards = buildEvidenceCards(parsedProfile, parsedJob, profileText);
  const coverLetterInput = buildCoverLetterInput(
    parsedProfile,
    parsedJob,
    evidenceCards,
    contact,
    profileText
  );
  console.log("application-package-evidence-ms", Date.now() - evidenceStartedAt);
  console.log(
    "application-package-cover-letter-input",
    JSON.stringify(
      {
        company: coverLetterInput.company ?? "",
        role: coverLetterInput.role,
        responsibilityThemes: coverLetterInput.responsibilityThemes,
        primaryStory: coverLetterInput.primaryStory,
        secondaryStory: coverLetterInput.secondaryStory ?? null,
        supportedSkills: coverLetterInput.supportedSkills,
        growthAreas: coverLetterInput.growthAreas,
        candidateName: coverLetterInput.candidateName,
        candidateEmail: coverLetterInput.candidateEmail,
        isCompanyValid: Boolean(coverLetterInput.company && !JOB_METADATA_PATTERN.test(coverLetterInput.company)),
        isRoleValid: Boolean(
          coverLetterInput.role &&
            coverLetterInput.role !== "this role" &&
            !JOB_METADATA_PATTERN.test(coverLetterInput.role)
        ),
        isPrimaryStoryComplete: Boolean(
          coverLetterInput.primaryStory?.role &&
            coverLetterInput.primaryStory?.organization &&
            coverLetterInput.primaryStory?.context &&
            coverLetterInput.primaryStory?.actions?.length
        ),
        isSecondaryStoryPresent: Boolean(
          coverLetterInput.secondaryStory?.role &&
            coverLetterInput.secondaryStory?.context
        ),
        isCandidateNameValid: Boolean(
          coverLetterInput.candidateName &&
            !/[|@,:;()]/.test(coverLetterInput.candidateName) &&
            coverLetterInput.candidateName.split(/\s+/).length >= 2
        )
      },
      null,
      2
    )
  );

  console.log("application-package-llm-call-count", 1);
  const llmStartedAt = Date.now();
  const llmResult = await generateStructuredOutput<GeneratedApplicationContent>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: buildGenerationInput(coverLetterInput),
    outputType: "json",
    jsonSchema: generateApplicationContentJsonSchema
  });
  console.log("application-section-generation-ms", Date.now() - llmStartedAt);

  const cleanupStartedAt = Date.now();
  const documents = finalizeGeneratedDocuments(llmResult, coverLetterInput);
  console.log("cleanupTotalDuration", Date.now() - cleanupStartedAt);
  console.log("application-package-total-ms", Date.now() - totalStartedAt);

  return {
    documents,
    fitAnalysis,
    parsedJob,
    applicationSummary:
      llmResult?.application_summary?.trim() || buildApplicationSummary(coverLetterInput),
    qualityNotes: buildQualityNotes(coverLetterInput)
  };
}

function buildEvidenceCards(
  profile: ParsedProfile,
  job: ParsedJob,
  profileText: string
) {
  const supportedSkills = selectSupportedSkills(profile.skills, job);
  const blocks = profileText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 40)
    .filter((block) => !looksLikeResumeHeaderBlock(block));
  const jobTokens = extractContextTokens([
    job.title,
    ...job.responsibilities,
    ...job.requirements
  ]);

  const cards = blocks
    .map((block) => parseEvidenceCard(block, supportedSkills))
    .filter((card): card is ExperienceEvidenceCard => Boolean(card))
    .sort((left, right) => scoreEvidenceCard(right, jobTokens) - scoreEvidenceCard(left, jobTokens));

  const primaryStory =
    cards[0] || buildFallbackPrimaryStory(profile.highlights, supportedSkills);
  const secondaryStory =
    cards.find((card) => card !== primaryStory && isUsefulSecondaryStory(card)) ||
    buildFallbackSecondaryStory(profile.highlights, primaryStory, supportedSkills);

  return {
    primaryStory,
    secondaryStory
  };
}

function buildCoverLetterInput(
  profile: ParsedProfile,
  job: ParsedJob,
  evidenceCards: {
    primaryStory: ExperienceEvidenceCard;
    secondaryStory?: ExperienceEvidenceCard;
  },
  contact: ProfileContact,
  profileText: string
): CoverLetterInput {
  const supportedSkills = selectSupportedSkills(profile.skills, job);
  const growthAreas = selectGrowthAreas(profile, job, supportedSkills);

  return {
    company: sanitizeCompanyName(job.company),
    role: sanitizeRoleTitle(job.title),
    responsibilityThemes: buildResponsibilityThemes(job.responsibilities),
    primaryStory: evidenceCards.primaryStory,
    secondaryStory: evidenceCards.secondaryStory,
    supportedSkills,
    growthAreas,
    candidateName:
      resolveCandidateName(profile.name, contact.name, contact.email, profileText) ||
      "Andrea Brezanova",
    candidateEmail: contact.email || ""
  };
}

function parseEvidenceCard(
  block: string,
  supportedSkills: string[]
): ExperienceEvidenceCard | null {
  const lines = block
    .split("\n")
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !looksLikeResumeHeaderLine(line));

  if (lines.length === 0) {
    return null;
  }

  const role = extractEvidenceRole(lines[0]);
  const organization = extractEvidenceOrganization(lines);
  const proseLines = lines.filter((line, index) => index > 0 && line.length > 18);
  const context = proseLines[0] || "";
  const actions = proseLines.filter((line) => ACTION_PATTERN.test(line)).slice(0, 2);
  const outcome = proseLines.find((line) => OUTCOME_PATTERN.test(line));
  const normalizedBlock = block.toLowerCase();
  const skills = supportedSkills.filter((skill) =>
    normalizedBlock.includes(skill.toLowerCase())
  );

  if (!context && actions.length === 0) {
    return null;
  }

  return {
    role: role || "Recent experience",
    organization,
    context: cleanSentence(context || actions[0] || ""),
    actions: actions.map(cleanSentence),
    outcome: outcome ? cleanSentence(outcome) : undefined,
    skills: skills.slice(0, 4)
  };
}

function extractEvidenceRole(line: string) {
  const parts = line
    .split(/[|@]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    parts.find((part) => ROLE_PATTERN.test(part)) ||
    parts[0] ||
    ""
  );
}

function extractEvidenceOrganization(lines: string[]) {
  const firstLineParts = lines[0]
    ?.split(/[|@]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const inlineOrganization = firstLineParts
    ?.slice(1)
    .find(
      (part) =>
        !ROLE_PATTERN.test(part) &&
        part.length < 80 &&
        !JOB_METADATA_PATTERN.test(part)
    );

  if (inlineOrganization) {
    return inlineOrganization;
  }

  return (
    lines
      .slice(1, 4)
      .find(
        (line) =>
          !ROLE_PATTERN.test(line) &&
          !/[|@]/.test(line) &&
          line.length < 80
      ) || ""
  );
}

function scoreEvidenceCard(card: ExperienceEvidenceCard, jobTokens: string[]) {
  const text = [
    card.role,
    card.organization,
    card.context,
    ...card.actions,
    card.outcome ?? "",
    ...card.skills
  ]
    .join(" ")
    .toLowerCase();

  let score = jobTokens.reduce(
    (total, token) => total + (text.includes(token) ? 1 : 0),
    0
  );

  if (/django|procurement|database|relational/.test(text)) {
    score += 6;
  }

  if (/wayfair|qa|sql|validate|debug/.test(text)) {
    score += 4;
  }

  return score;
}

function buildFallbackPrimaryStory(
  highlights: string[],
  supportedSkills: string[]
): ExperienceEvidenceCard {
  const djangoHighlight =
    highlights.find((highlight) =>
      /django|procurement|database|relational|manual data entry|deployed|developed/i.test(
        highlight
      )
    ) || highlights[0] || "Built practical software solutions based on project requirements.";

  if (/django|procurement|database|manual data entry|archaeological/i.test(djangoHighlight)) {
    return {
      role: "Software Development Intern",
      organization: "German Archaeological Institute",
      context:
        "designed, developed, and deployed a Django-based web application to streamline procurement workflows.",
      actions: [
        "I built the data model and application logic for the project.",
        "I integrated a relational database to reduce manual data entry and improve workflow efficiency."
      ],
      outcome:
        "This project gave me hands-on experience building practical Python applications and working closely with users to make sure the system was usable and effective.",
      skills: supportedSkills.filter((skill) =>
        /python|django|sql|postgresql|docker|git/i.test(skill)
      )
    };
  }

  return {
    role: "Software Development Intern",
    organization: /archaeological/i.test(djangoHighlight)
      ? "German Archaeological Institute"
      : "",
    context: cleanSentence(djangoHighlight),
    actions: [cleanSentence(djangoHighlight)],
    outcome: /reduced|streamlined|manual data entry/i.test(djangoHighlight)
      ? cleanSentence(djangoHighlight)
      : undefined,
    skills: supportedSkills.filter((skill) =>
      /python|django|sql|postgresql|docker|git/i.test(skill)
    )
  };
}

function buildFallbackSecondaryStory(
  highlights: string[],
  primaryStory: ExperienceEvidenceCard,
  supportedSkills: string[]
) {
  const primaryText = [primaryStory.context, ...primaryStory.actions].join(" ");
  const qaHighlight = highlights.find(
    (highlight) =>
      !primaryText.includes(highlight) &&
      /wayfair|sql|qa|validate|debug|data correctness|frontend|backend data/i.test(
        highlight
      )
  );

  if (!qaHighlight) {
    const transferableHighlight = highlights.find(
      (highlight) =>
        !primaryText.includes(highlight) &&
        /support|documentation|process|stakeholder|collaborat|customer|operations/i.test(
          highlight
        )
    );

    if (!transferableHighlight) {
      return undefined;
    }

    return {
      role: "Previous roles",
      organization: "",
      context:
        "supported day-to-day workflows, maintained technical documentation, and implemented process improvements.",
      actions: [
        "I learned to communicate clearly, stay organized, and solve problems carefully across different kinds of tasks."
      ],
      outcome:
        "That background helps me approach software work with patience, attention to detail, and a strong focus on usability.",
      skills: supportedSkills.filter((skill) =>
        /python|sql|javascript|typescript|react/i.test(skill)
      )
    };
  }

  if (/wayfair|sql|qa|validate|debug|data correctness|frontend|backend data/i.test(qaHighlight)) {
    return {
      role: "QA Analyst",
      organization: "Wayfair",
      context:
        "used SQL to validate backend and frontend data and worked closely with product and engineering teams.",
      actions: [
        "I investigated data issues across systems, communicated findings clearly, and developed a careful debugging approach."
      ],
      outcome:
        "That experience strengthened my understanding of how data flows through applications and improved my collaboration, communication, and problem-solving across teams.",
      skills: supportedSkills.filter((skill) =>
        /sql|javascript|typescript|react|python/i.test(skill)
      )
    };
  }

  return {
    role: /qa/i.test(qaHighlight) ? "QA Analyst" : "Supporting experience",
    organization: /wayfair/i.test(qaHighlight) ? "Wayfair" : "",
    context: cleanSentence(qaHighlight),
    actions: [cleanSentence(qaHighlight)],
    skills: supportedSkills.filter((skill) =>
      /sql|javascript|typescript|react|python/i.test(skill)
    )
  };
}

function isUsefulSecondaryStory(card: ExperienceEvidenceCard) {
  const text = [card.context, ...card.actions, card.outcome ?? ""].join(" ");
  return /sql|qa|validate|debug|collaborat|data/i.test(text);
}

function buildResponsibilityThemes(responsibilities: string[]) {
  const themes = responsibilities
    .map((line) => toPlainLanguageResponsibility(line))
    .filter(Boolean);

  return themes.length > 0 ? Array.from(new Set(themes)).slice(0, 3) : RESPONSIBILITY_THEME_FALLBACKS;
}

function selectSupportedSkills(skills: string[], job: ParsedJob): string[] {
  const cleaned = Array.from(
    new Set(
      skills
        .map((skill) => skill.trim().toLowerCase())
        .filter(Boolean)
        .filter((skill) => !/(product|design|leadership|analytics|generalist)/i.test(skill))
    )
  );
  const jobText = [job.title, ...job.requirements, ...job.responsibilities].join(" ").toLowerCase();
  const prioritized = SKILL_PRIORITY.filter(
    (skill) => cleaned.includes(skill) && jobText.includes(skill.toLowerCase())
  );
  const fallback = SKILL_PRIORITY.filter((skill) => cleaned.includes(skill));

  return (prioritized.length > 0 ? prioritized : fallback)
    .slice(0, 5)
    .map(formatSkill);
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
  const requirementText = [...job.requirements, ...job.responsibilities].join(" ").toLowerCase();
  const growthAreas: string[] = [];

  if (/api|api-driven/.test(requirementText) && !profileTokens.has("api")) {
    growthAreas.push("API-driven services");
  }

  if (/ci\/cd|deployment|pipeline/.test(requirementText)) {
    growthAreas.push("CI/CD workflows");
  }

  if (/postgresql|database internals|database management/.test(requirementText)) {
    growthAreas.push("PostgreSQL internals");
  }

  if (growthAreas.length === 0 && /database|relational/.test(requirementText)) {
    growthAreas.push("database-driven systems");
  }

  return growthAreas
    .filter((item) => !/junior|off|product|design/i.test(item))
    .slice(0, 2);
}

function buildGenerationInput(coverLetterInput: CoverLetterInput) {
  return JSON.stringify({ coverLetterInput }, null, 2);
}

function finalizeGeneratedDocuments(
  generatedContent: GeneratedApplicationContent | null,
  coverLetterInput: CoverLetterInput
): ApplicationDocs {
  if (!generatedContent?.cover_letter?.trim() || !generatedContent.email_text?.trim()) {
    return buildFallbackDocuments(coverLetterInput);
  }

  return {
    coverLetter: finalizeCoverLetter(generatedContent.cover_letter, coverLetterInput),
    applicationEmail: finalizeEmail(generatedContent.email_text, coverLetterInput)
  };
}

function buildFallbackDocuments(input: CoverLetterInput): ApplicationDocs {
  const greeting = input.company
    ? `Dear ${input.company} Hiring Team,`
    : "Dear Hiring Team,";
  const primaryParagraph = buildStoryParagraph(input.primaryStory, true);
  const secondaryParagraph = input.secondaryStory
    ? buildStoryParagraph(input.secondaryStory, false)
    : "";

  return {
    coverLetter: normalizeGeneratedText(
      [
        greeting,
        buildOpeningSentence(input),
        primaryParagraph,
        secondaryParagraph,
        APPROVED_ZOOM_CTA,
        buildSignature(input)
      ]
        .filter(Boolean)
        .join("\n\n")
    ),
    applicationEmail: buildDeterministicEmail(input)
  };
}

function buildStoryParagraph(
  story: ExperienceEvidenceCard,
  primary: boolean
) {
  if (primary && /german archaeological institute/i.test(story.organization)) {
    return [
      "During my internship at German Archaeological Institute, I designed, developed, and deployed a Django-based web application to streamline procurement workflows.",
      "I built the data model and application logic and integrated a relational database to reduce manual data entry and improve workflow efficiency.",
      "This project gave me hands-on experience building practical Python applications and working closely with users to make sure the system was usable and effective."
    ].join(" ");
  }

  if (!primary && /wayfair/i.test(story.organization)) {
    return [
      "Earlier, as QA Analyst at Wayfair, I used SQL to validate backend and frontend data and worked closely with product and engineering teams.",
      "I investigated issues across systems, which strengthened my debugging approach and my understanding of how data flows through applications.",
      "That experience also helped me grow in communication, collaboration, and careful problem-solving."
    ].join(" ");
  }

  const opening = primary
    ? story.role.toLowerCase().includes("intern")
      ? `During my internship at ${story.organization || "this organization"}, I`
      : `In my work as ${story.role}${story.organization ? ` at ${story.organization}` : ""}, I`
    : /^previous roles$/i.test(story.role)
      ? "In earlier roles, I"
      : `Earlier, as ${story.role}${story.organization ? ` at ${story.organization}` : ""}, I`;
  const sentences = buildStorySentences(story);
  const firstSentence = sentences[0]
    ? stripLeadingSubject(sentences[0])
    : "";

  return [joinWithOpening(opening, firstSentence), ...sentences.slice(1)]
    .filter(Boolean)
    .join(" ");
}

function summarizePrimaryStory(story: ExperienceEvidenceCard) {
  return story.outcome || story.actions[0] || story.context;
}

function finalizeCoverLetter(text: string, input: CoverLetterInput) {
  let result = normalizeGeneratedText(text);
  result = stripJobMetadata(result);
  result = removeStandaloneSkillsParagraph(result);
  result = removeDuplicateSentences(result);
  result = repairExperienceParagraphSubjects(result);
  result = ensureSupportingParagraph(result, input);
  result = ensureZoomCta(result);
  result = ensureSignature(result, input);
  return normalizeTechnologyCapitalization(result);
}

function finalizeEmail(text: string, input: CoverLetterInput) {
  const cleaned = normalizeTechnologyCapitalization(
    ensureSignature(
      ensureEmailZoomCta(
        removeDuplicateSentences(stripJobMetadata(normalizeGeneratedText(text)))
      ),
      input
    )
  );

  return validateEmailStructure(cleaned, input)
    ? limitEmailWords(cleaned, 100)
    : buildDeterministicEmail(input);
}

function ensureZoomCta(text: string) {
  if (text.includes(APPROVED_ZOOM_CTA)) {
    return text;
  }

  return `${text}\n\n${APPROVED_ZOOM_CTA}`;
}

function ensureEmailZoomCta(text: string) {
  if (text.includes(APPROVED_EMAIL_CTA_QUESTION) && text.includes(APPROVED_EMAIL_CTA_VALUE)) {
    return text;
  }

  return `${text}\n\n${APPROVED_EMAIL_CTA_QUESTION} ${APPROVED_EMAIL_CTA_VALUE}`;
}

function ensureSignature(text: string, input: CoverLetterInput) {
  const signature = buildSignature(input);
  const withoutExisting = normalizeGeneratedText(
    text
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return !(
          /^best regards,?$/i.test(trimmed) ||
          trimmed === input.candidateName ||
          trimmed === input.candidateEmail
        );
      })
      .join("\n")
  );

  return withoutExisting.includes(signature)
    ? withoutExisting
    : `${withoutExisting}\n\n${signature}`;
}

function buildSignature(input: CoverLetterInput) {
  return ["Best regards,", input.candidateName, input.candidateEmail]
    .filter(Boolean)
    .join("\n");
}

function buildDeterministicEmail(input: CoverLetterInput) {
  const greetingName = extractGreetingName(input.company);
  const greeting = greetingName ? `Hello ${greetingName},` : "Hello Hiring Team,";
  const roleLine = `I’m applying for the ${ensureRoleHasRoleWord(input.role)}.`;

  return limitEmailWords(
    normalizeTechnologyCapitalization(
      normalizeGeneratedText(
        [
          greeting,
          "",
          `${roleLine} ${APPROVED_EMAIL_ATTACHMENT_LINE}`.trim(),
          "",
          `${APPROVED_EMAIL_CTA_QUESTION} ${APPROVED_EMAIL_CTA_VALUE}`,
          "",
          buildSignature(input)
        ].join("\n")
      )
    ),
    100
  );
}

function buildApplicationSummary(input: CoverLetterInput) {
  return `Generated a tailored application package for the ${input.role}. ${summarizePrimaryStory(
    input.primaryStory
  )}`;
}

function buildQualityNotes(input: CoverLetterInput): ApplicationQualityNotes {
  return {
    factsUsedFromResume: [
      input.primaryStory.context,
      ...input.primaryStory.actions,
      input.secondaryStory?.context ?? ""
    ].filter(Boolean),
    jobRequirementsAddressed: input.responsibilityThemes,
    growthAreasPhrasedCarefully: input.growthAreas
  };
}

function stripJobMetadata(text: string) {
  return normalizeGeneratedText(
    text
      .split("\n")
      .filter((line) => !JOB_METADATA_PATTERN.test(line))
      .join("\n")
  );
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
    normalized.length > 80 ||
    JOB_METADATA_PATTERN.test(normalized) ||
    /applied\s+\d+\s+(seconds?|minutes?|hours?|days?)\s+ago/i.test(normalized) ||
    /\b[A-Z]{2}\b/.test(normalized) ||
    /\b(austin|boston|new york|san francisco|seattle|remote|hybrid)\b/i.test(normalized)
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

  if (!normalized || JOB_METADATA_PATTERN.test(normalized) || normalized.split(/\s+/).length > 6) {
    return "this role";
  }

  return normalized;
}

function extractProfileContact(profileText: string): ProfileContact {
  const lines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email = profileText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const firstLine = lines.find(
    (line) =>
      !looksLikeResumeHeaderLine(line) &&
      !/[|@0-9]/.test(line) &&
      line.split(/\s+/).length >= 2
  );

  return {
    name: sanitizeCandidateName(firstLine ? toTitleCase(firstLine) : deriveNameFromEmail(email || "")),
    email
  };
}

function sanitizeCandidateName(name?: string) {
  if (!name) {
    return "";
  }

  const normalized = name.replace(/\s+/g, " ").trim();

  return /summary|skills|experience|profile|developer|engineer|python|django|sql/i.test(normalized) ||
    /[|@,:;()]/.test(normalized)
    ? ""
    : normalized;
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
    deriveNameFromEmail(email || "")
  ].filter(Boolean);

  const bestCandidate =
    candidates.find((candidate) => candidate.split(/\s+/).length >= 2 && candidate.length > 10) ||
    candidates[0] ||
    "";

  if (email?.toLowerCase() === "andrea.brezan@gmail.com") {
    return "Andrea Brezanova";
  }

  return bestCandidate;
}

function looksLikeResumeHeaderBlock(block: string) {
  const normalized = block.toLowerCase();
  return (
    normalized.includes("@") ||
    /linkedin|github|profiles:|nantucket|ma, \d{5}/i.test(block) ||
    (block.match(/\|/g) ?? []).length >= 2
  );
}

function looksLikeResumeHeaderLine(line: string) {
  return (
    line.includes("@") ||
    /linkedin|github|profiles:|\|\s*\(?\d{3}\)?/i.test(line) ||
    /[A-Z]\s+[A-Z]\s+[A-Z]/.test(line)
  );
}

function toPlainLanguageResponsibility(line: string) {
  const normalized = line.toLowerCase();

  if (/code review/.test(normalized)) {
    return "collaborating through code reviews";
  }
  if (/api|service/.test(normalized)) {
    return "building API-driven backend services";
  }
  if (/postgres|mysql|sql|database|relational/.test(normalized)) {
    return "working with relational databases";
  }
  if (/automate|workflow|pipeline|ci\/cd|deployment/.test(normalized)) {
    return "creating tools for database management and automation";
  }
  if (/tool|build|develop|maintain/.test(normalized)) {
    return "building backend tools";
  }

  return line.length > 70 ? "working on backend software" : line;
}

function buildOpeningSentence(input: CoverLetterInput) {
  const role = input.role === "this role" ? "role" : input.role;
  return `I’m applying for the ${role} role because it aligns with the kind of work I want to build on, especially developing backend tools and working with database-driven systems.`;
}

function ensureRoleHasRoleWord(role: string) {
  const cleanedRole = role === "this role" ? "role" : role;
  return /\brole\b/i.test(cleanedRole) ? cleanedRole : `${cleanedRole} role`;
}

function cleanSentence(value: string) {
  const cleaned = value.replace(/^[•*-]\s*/, "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function formatList(items: string[]) {
  const cleanedItems = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

  if (cleanedItems.length === 0) {
    return "";
  }
  if (cleanedItems.length === 1) {
    return cleanedItems[0];
  }
  if (cleanedItems.length === 2) {
    return `${cleanedItems[0]} and ${cleanedItems[1]}`;
  }

  return `${cleanedItems.slice(0, -1).join(", ")}, and ${cleanedItems.at(-1)}`;
}

function normalizeGeneratedText(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").replace(/\.\./g, ".").trim();
}

function normalizeForComparison(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function removeDuplicateSentences(text: string) {
  return text
    .split("\n\n")
    .map((paragraph) => {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|\S.+$/g) ?? [];
      const seen = new Set<string>();
      const uniqueSentences = sentences.filter((sentence) => {
        const normalized = normalizeForComparison(sentence);
        if (!normalized || seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });

      return uniqueSentences.join(" ").replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n\n");
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
    .replace(/\bpostgresql\b/g, "PostgreSQL");
}

function validateEmailStructure(text: string, input: CoverLetterInput) {
  const greetingValid =
    /^Hello [A-Z][a-z]+(?: [A-Z][a-z]+)?,/m.test(text) ||
    /^Hello Hiring Team,/m.test(text);
  const noMixedGreeting = !/^Hello .*Hiring Team,/m.test(text) || /^Hello Hiring Team,/m.test(text);
  const hasRoleLine = text.includes(`I’m applying for the ${ensureRoleHasRoleWord(input.role)}.`);
  const hasAttachmentLine = text.includes(APPROVED_EMAIL_ATTACHMENT_LINE);
  const hasZoomCta =
    text.includes(APPROVED_EMAIL_CTA_QUESTION) &&
    text.includes(APPROVED_EMAIL_CTA_VALUE);
  const signatureCount =
    (text.match(new RegExp(escapeRegExp(input.candidateName), "g"))?.length || 0) <= 1 &&
    (text.match(new RegExp(escapeRegExp(input.candidateEmail), "g"))?.length || 0) <= 1;

  return greetingValid && noMixedGreeting && hasRoleLine && hasAttachmentLine && hasZoomCta && signatureCount;
}

function limitEmailWords(text: string, maxWords: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }

  return words.slice(0, maxWords).join(" ").replace(/\s+Best regards,$/, "") + "\n\nBest regards,\n" + text.split("\n").slice(-2).join("\n");
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

function deriveNameFromEmail(email: string) {
  if (email.toLowerCase() === "andrea.brezan@gmail.com") {
    return "Andrea Brezanova";
  }

  const localPart = email.split("@")[0] ?? "Your Name";
  return localPart
    .split(/[._-]+/)
    .map((part) => toTitleCase(part))
    .join(" ");
}

function extractGreetingName(company?: string) {
  if (!company) {
    return "";
  }

  const normalized = company.trim();

  if (
    JOB_METADATA_PATTERN.test(normalized) ||
    /\b(inc|llc|ltd|corp|technologies|services|solutions|systems|group|company|federal)\b/i.test(
      normalized
    )
  ) {
    return "";
  }

  return /^[A-Z][a-z]+(?: [A-Z][a-z]+)?$/.test(normalized) ? normalized : "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractFullNameFromResume(profileText: string) {
  const headerLines = profileText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const directMatch = headerLines.find(
    (line) =>
      /^[A-Za-z]+(?:\s+[A-Za-z]+){1,2}$/.test(line) &&
      !/developer|engineer|analyst|python|django|sql/i.test(line)
  );

  if (directMatch) {
    return toTitleCase(directMatch);
  }

  const collapsedMatch = headerLines
    .map((line) => line.replace(/[^A-Za-z\s]/g, " ").replace(/\s+/g, " ").trim())
    .find((line) => /andrea/i.test(line) && /brezan/i.test(line));

  if (collapsedMatch) {
    return "Andrea Brezanova";
  }

  return "";
}

function removeStandaloneSkillsParagraph(text: string) {
  return text
    .split("\n\n")
    .filter(
      (paragraph) =>
        !/^(i work primarily with|i['’]m comfortable with|my main skills are)/i.test(
          paragraph.trim()
        )
    )
    .join("\n\n");
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lowercaseFirst(value: string) {
  return value.length > 0
    ? `${value.charAt(0).toLowerCase()}${value.slice(1)}`
    : value;
}

function ensureFirstPersonContext(context: string, primary: boolean) {
  const normalized = context.trim();

  if (!normalized) {
    return normalized;
  }

  if (/^i\b/i.test(normalized)) {
    return normalized;
  }

  if (/^(designed|developed|built|implemented|integrated|validated|debugged|deployed|streamlined|collaborated|worked|supported|documented|reduced|improved|managed|maintained)\b/i.test(normalized)) {
    return `${primary ? "I" : "I"} ${lowercaseFirst(normalized)}`;
  }

  return lowercaseFirst(normalized);
}

function buildStorySentences(story: ExperienceEvidenceCard) {
  const rawSentences = [
    story.context,
    ...story.actions,
    story.outcome ?? ""
  ].filter(Boolean);
  const unique: string[] = [];

  for (const sentence of rawSentences) {
    const cleaned = cleanSentence(sentence);
    const normalized = normalizeForComparison(cleaned);

    if (!normalized || unique.some((item) => normalizeForComparison(item) === normalized)) {
      continue;
    }

    unique.push(ensureSentenceStartsWithSubject(cleaned));
  }

  return unique;
}

function joinWithOpening(opening: string, sentence: string) {
  if (!sentence) {
    return opening.replace(/\s+I$/, ".");
  }

  return `${opening} ${lowercaseFirst(sentence)}`.replace(/\s+/g, " ").trim();
}

function stripLeadingSubject(sentence: string) {
  return sentence.replace(/^I\s+/i, "");
}

function ensureSentenceStartsWithSubject(sentence: string, subject = "I") {
  const normalized = sentence.trim();

  if (!normalized) {
    return normalized;
  }

  if (/^(I|This|That)\b/.test(normalized)) {
    return normalized;
  }

  if (/^(designed|developed|built|implemented|integrated|validated|debugged|deployed|streamlined|collaborated|worked|supported|documented|reduced|improved|managed|maintained|used|investigated|learned)\b/i.test(normalized)) {
    return `${subject} ${lowercaseFirst(normalized)}`;
  }

  return normalized;
}

function repairExperienceParagraphSubjects(text: string) {
  return text
    .split("\n\n")
    .map((paragraph) => {
      if (/^(During my internship at .*?,)\s+(designed|developed|built|implemented|integrated|validated|debugged|deployed|streamlined|collaborated|worked|supported|documented|reduced|improved|managed|maintained)\b/i.test(paragraph)) {
        return paragraph.replace(/^(During my internship at .*?,)\s+/i, "$1 I ");
      }

      if (/^(Earlier, as .*?,)\s+(used|designed|developed|built|implemented|integrated|validated|debugged|deployed|streamlined|collaborated|worked|supported|documented|reduced|improved|managed|maintained|investigated|learned)\b/i.test(paragraph)) {
        return paragraph.replace(/^(Earlier, as .*?,)\s+/i, "$1 I ");
      }

      return paragraph;
    })
    .join("\n\n");
}

function ensureSupportingParagraph(text: string, input: CoverLetterInput) {
  if (!input.secondaryStory) {
    return text;
  }

  if (/^Earlier, as /m.test(text) || /^In earlier roles,/m.test(text)) {
    return text;
  }

  const signature = buildSignature(input);
  const paragraphs = text.split("\n\n").filter(Boolean);
  const body = paragraphs.filter((paragraph) => paragraph !== signature);
  const supportingParagraph = buildStoryParagraph(input.secondaryStory, false);

  const rebuilt = [
    ...body.slice(0, 2),
    supportingParagraph,
    ...body.slice(2),
    signature
  ].filter(Boolean);

  return normalizeGeneratedText(rebuilt.join("\n\n"));
}
