import type {
  ApplicationDocs,
  GeneratedApplicationContent,
} from "@/lib/types";
import type { GenerationPayload } from "./payload";

const EMAIL_CTA_QUESTION =
  "Would you be available for a short Zoom call to discuss the role?";

const JOB_METADATA_PATTERN =
  /(applied\s+\d+\s+(seconds?|minutes?|hours?|days?)\s+ago|reposted|promoted|applicants?|clicked apply|actively reviewing|easy apply|matches your job preferences|hybrid|on-site|onsite|remote|full[- ]time|part[- ]time|contract|save\b|see how you compare|meet the hiring team|show more options)/i;

export function finalizeGeneratedDocuments(
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
  result = normalizeLegacyCta(result);
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
  const greeting = isUsableCompanyGreeting(payload.parsedCompany)
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
          /^(best regards|kind regards|sincerely),?$/i.test(trimmed) ||
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
          /^(best regards|kind regards|sincerely),?$/i.test(trimmed) ||
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
        /^(best regards|kind regards|sincerely),?$/im.test(paragraph) ||
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

function isUsableCompanyGreeting(company?: string) {
  if (!company) {
    return false;
  }

  return (
    company.length < 60 &&
    !/[0-9]/.test(company) &&
    !/,/.test(company) &&
    !/\b(remote|hybrid|on-site|onsite)\b/i.test(company) &&
    !/\b(berlin|london|paris|munich|hamburg|new york|san francisco|seattle|austin|boston|germany|united states|usa|uk)\b/i.test(company)
  );
}

function normalizeGeneratedText(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").replace(/\.\./g, ".").trim();
}

function normalizeLegacyCta(text: string) {
  return text.replace(
    /Would you be available for a short Zoom call(?:\s+this week)?\s+to (?:discuss|explore) [^?]+\?/gi,
    EMAIL_CTA_QUESTION
  );
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
