import { analyzeParsedJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { createPositioningStrategy } from "@/lib/engines/positioningEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_APPLICATION_PROMPT } from "@/lib/llm/prompts";
import { debugJson, debugLog } from "@/lib/logging";
import type {
  ApplicationDocs,
  ApplicationPackage,
  GeneratedApplicationContent,
} from "@/lib/types";
import { extractResumeExperiences } from "./evidence";
import { finalizeGeneratedDocuments } from "./finalization";
import {
  buildApplicationSummary,
  buildCoverLetterInputDebug,
  buildGenerationPayload,
  buildQualityNotes,
  extractProfileContact,
  validateGenerationPayload,
} from "./payload";
import {
  selectPositionedPrimaryStory,
  selectPositionedSecondaryStory,
  selectPrimaryStory,
  selectSecondaryStory,
} from "./stories";

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
  debugLog("application-package-parse-ms", Date.now() - parseStartedAt);
  debugLog("parsedCandidateName", parsedProfile.name || "");

  const fitStartedAt = Date.now();
  const fitAnalysis = analyzeParsedJobFit(parsedProfile, parsedJob);
  debugLog("application-package-fit-ms", Date.now() - fitStartedAt);

  const payloadStartedAt = Date.now();
  debugJson("parsedProfile", parsedProfile);
  const experienceParseResult = extractResumeExperiences(profileText);
  const extractedExperiences = experienceParseResult.experiences;
  debugLog("resumeTextLength", profileText.length);
  debugJson("detectedSections", experienceParseResult.detectedSections);
  debugJson("rawExperienceBlocks", experienceParseResult.rawExperienceBlocks);
  const initiallySelectedPrimaryStory = selectPrimaryStory(
    extractedExperiences,
    parsedJob,
    profileText
  );
  const initiallySelectedSecondaryStory = selectSecondaryStory(
    extractedExperiences,
    initiallySelectedPrimaryStory
  );
  const positioningStrategy = createPositioningStrategy({
    parsedProfile,
    parsedJob,
    fitAnalysis,
    experiences: extractedExperiences,
    resumeText: profileText,
    jobDescriptionText: jobDescription,
  });
  const selectedPrimaryStory = selectPositionedPrimaryStory(
    extractedExperiences,
    positioningStrategy,
    initiallySelectedPrimaryStory,
    profileText
  );
  const selectedSecondaryStory = selectPositionedSecondaryStory(
    extractedExperiences,
    selectedPrimaryStory,
    positioningStrategy,
    initiallySelectedSecondaryStory
  );
  debugJson("extractedExperiences", extractedExperiences);
  debugJson("selectedPrimaryStory", selectedPrimaryStory ?? null);
  debugJson("selectedSecondaryStory", selectedSecondaryStory ?? null);

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
    fitAnalysis,
    contact,
    selectedPrimaryStory,
    selectedSecondaryStory,
    positioningStrategy
  );
  debugLog("application-package-evidence-ms", Date.now() - payloadStartedAt);
  debugJson("supportedSkills", generationPayload.supportedSkills);
  debugJson("growthAreas", generationPayload.growthAreas);
  debugJson("positioningStrategy", generationPayload.positioningStrategy);
  debugJson("applicationBrief", generationPayload.applicationBrief);
  const coverLetterInputDebug = buildCoverLetterInputDebug(generationPayload);
  debugJson("application-package-cover-letter-input", coverLetterInputDebug);
  const validation = validateGenerationPayload(generationPayload);
  if (!validation.ok) {
    debugJson("generationValidationFailed", {
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
    });
    throw new Error(
      validation.reason ||
        `Could not extract enough resume evidence to generate a cover letter. Failed field: ${validation.failedField}`
    );
  }

  debugLog("application-package-llm-call-count", 1);
  const llmStartedAt = Date.now();
  const llmResult = await generateStructuredOutput<GeneratedApplicationContent>({
    prompt: GENERATE_APPLICATION_PROMPT,
    input: JSON.stringify({ generationPayload }, null, 2),
    outputType: "json",
  });
  debugLog("application-section-generation-ms", Date.now() - llmStartedAt);

  const fallbackUsed =
    !llmResult?.data?.cover_letter?.trim() || !llmResult.data.email_text?.trim();

  if (fallbackUsed) {
    debugJson("application-package-debug", {
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
    });
  }

  const cleanupStartedAt = Date.now();
  const documents = finalizeGeneratedDocuments(llmResult.data, generationPayload);
  debugLog("cleanupTotalDuration", Date.now() - cleanupStartedAt);
  debugJson("application-package-debug", {
    wasOpenAIUsed: llmResult.wasOpenAIUsed,
    model: llmResult.model,
    rawOpenAIResponse: llmResult.rawOutputText,
    finalCleanedCoverLetter: documents.coverLetter,
    candidateName: generationPayload.candidateName,
    parsedRole: generationPayload.parsedRole,
    parsedCompany: generationPayload.parsedCompany ?? "",
    fallbackUsed,
    openAIError: llmResult.error ?? ""
  });
  debugLog("application-package-total-ms", Date.now() - totalStartedAt);

  return {
    documents,
    fitAnalysis,
    parsedProfile,
    parsedJob,
    applicationSummary:
      llmResult.data?.application_summary?.trim() ||
      buildApplicationSummary(parsedProfile, generationPayload.parsedRole),
    qualityNotes: buildQualityNotes(generationPayload),
    positioningStrategy: generationPayload.positioningStrategy,
    applicationBrief: generationPayload.applicationBrief,
  };
}
