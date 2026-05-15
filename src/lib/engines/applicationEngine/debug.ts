import { analyzeParsedJobFit, parseJobText } from "@/lib/engines/matchEngine";
import { createPositioningStrategy } from "@/lib/engines/positioningEngine";
import { parseProfileText } from "@/lib/engines/profileEngine";
import type { FitAnalysis } from "@/lib/types";
import { extractResumeExperiences } from "./evidence";
import {
  buildCoverLetterInputDebug,
  buildGenerationPayload,
  extractProfileContact,
  validateGenerationPayload,
} from "./payload";
import {
  selectPositionedPrimaryStory,
  selectPositionedSecondaryStory,
  selectPrimaryStory,
  selectSecondaryStory,
} from "./stories";

export type GenerationDebugSnapshot = {
  rawJobLinesPreview: string[];
  parsedJob: {
    title: string;
    company?: string;
    locationText?: string;
    responsibilities: string[];
    requirements: string[];
    keywords: string[];
  };
  fitAnalysis: Pick<FitAnalysis, "fitScore" | "recommendation" | "strengths" | "gaps">;
  payload: {
    parsedRole: string;
    parsedCompany?: string;
    candidateName: string;
    supportedSkills: string[];
    growthAreas: string[];
    jobDescriptionPreview: string[];
    companyDebug: ReturnType<typeof buildCoverLetterInputDebug>["company"];
    roleDebug: ReturnType<typeof buildCoverLetterInputDebug>["role"];
    isCompanyValid: boolean;
    isRoleValid: boolean;
  };
  validation: {
    ok: boolean;
    failedField?: string;
    reason?: string;
  };
  storySelection: {
    extractedExperienceCount: number;
    hasPrimaryStory: boolean;
    hasSecondaryStory: boolean;
    primaryStoryRole?: string;
    primaryStoryOrganization?: string;
  };
};

export async function inspectGenerationInputs(
  profileText: string,
  jobDescription: string
): Promise<GenerationDebugSnapshot> {
  const parsedProfile = await parseProfileText(profileText);
  const parsedJob = parseJobText(jobDescription);
  const fitAnalysis = analyzeParsedJobFit(parsedProfile, parsedJob);
  const contact = extractProfileContact(profileText);
  const experienceParseResult = extractResumeExperiences(profileText);
  const extractedExperiences = experienceParseResult.experiences;

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

  if (!selectedPrimaryStory) {
    return {
      rawJobLinesPreview: normalizeJobLinesPreview(jobDescription),
      parsedJob,
      fitAnalysis: {
        fitScore: fitAnalysis.fitScore,
        recommendation: fitAnalysis.recommendation,
        strengths: fitAnalysis.strengths,
        gaps: fitAnalysis.gaps,
      },
      payload: {
        parsedRole: "this role",
        candidateName: parsedProfile.name || "",
        supportedSkills: [],
        growthAreas: [],
        jobDescriptionPreview: normalizeJobLinesPreview(jobDescription),
        companyDebug: "",
        roleDebug: "this role",
        isCompanyValid: false,
        isRoleValid: false,
      },
      validation: {
        ok: false,
        failedField: "primaryStory",
        reason: "Could not extract enough resume evidence to generate a cover letter.",
      },
      storySelection: {
        extractedExperienceCount: extractedExperiences.length,
        hasPrimaryStory: false,
        hasSecondaryStory: false,
      },
    };
  }

  const payload = buildGenerationPayload(
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
  const validation = validateGenerationPayload(payload);
  const coverLetterDebug = buildCoverLetterInputDebug(payload);

  return {
    rawJobLinesPreview: normalizeJobLinesPreview(jobDescription),
    parsedJob,
    fitAnalysis: {
      fitScore: fitAnalysis.fitScore,
      recommendation: fitAnalysis.recommendation,
      strengths: fitAnalysis.strengths,
      gaps: fitAnalysis.gaps,
    },
    payload: {
      parsedRole: payload.parsedRole,
      parsedCompany: payload.parsedCompany,
      candidateName: payload.candidateName,
      supportedSkills: payload.supportedSkills,
      growthAreas: payload.growthAreas,
      jobDescriptionPreview: payload.jobDescriptionText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10),
      companyDebug: coverLetterDebug.company,
      roleDebug: coverLetterDebug.role,
      isCompanyValid: coverLetterDebug.isCompanyValid,
      isRoleValid: coverLetterDebug.isRoleValid,
    },
    validation: {
      ok: validation.ok,
      failedField: validation.failedField,
      reason: validation.reason,
    },
    storySelection: {
      extractedExperienceCount: extractedExperiences.length,
      hasPrimaryStory: true,
      hasSecondaryStory: Boolean(selectedSecondaryStory),
      primaryStoryRole: selectedPrimaryStory.role,
      primaryStoryOrganization: selectedPrimaryStory.organization,
    },
  };
}

function normalizeJobLinesPreview(jobDescription: string) {
  return jobDescription
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);
}
