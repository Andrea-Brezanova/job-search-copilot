import { debugJson } from "@/lib/logging";
import type {
  ExperienceEvidenceCard,
  ParsedJob,
  PositioningStrategy,
} from "@/lib/types";
import {
  buildFallbackPrimaryStoryFromResume,
  getExperienceDetailScore,
} from "./evidence";

type ScoredExperienceBlock = {
  experience: ExperienceEvidenceCard;
  score: number;
};

export function selectPrimaryStory(
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
  debugJson("scoredExperienceBlocks", scored);

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

export function selectPositionedPrimaryStory(
  experiences: ExperienceEvidenceCard[],
  positioningStrategy: PositioningStrategy,
  currentPrimaryStory: ExperienceEvidenceCard | undefined,
  profileText: string
) {
  if (
    positioningStrategy.generationMode === "strong_match" ||
    positioningStrategy.generationMode === "partial_match"
  ) {
    return currentPrimaryStory;
  }

  const transferableCandidate = experiences
    .map((experience) => ({
      experience,
      score: scoreTransferableExperience(experience, positioningStrategy),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (transferableCandidate?.score > 0) {
    return transferableCandidate.experience;
  }

  return currentPrimaryStory ?? buildFallbackPrimaryStoryFromResume(profileText);
}

export function selectSecondaryStory(
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

export function selectPositionedSecondaryStory(
  experiences: ExperienceEvidenceCard[],
  primaryStory: ExperienceEvidenceCard | undefined,
  positioningStrategy: PositioningStrategy,
  currentSecondaryStory?: ExperienceEvidenceCard
) {
  if (
    positioningStrategy.generationMode === "strong_match" ||
    positioningStrategy.generationMode === "partial_match"
  ) {
    return currentSecondaryStory;
  }

  const candidate = experiences
    .filter((experience) => experience !== primaryStory)
    .map((experience) => ({
      experience,
      score: scoreTransferableExperience(experience, positioningStrategy),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return candidate?.score ? candidate.experience : currentSecondaryStory;
}

export function isCompleteStory(story?: ExperienceEvidenceCard) {
  if (!story) {
    return false;
  }

  return Boolean(
    (story.role?.trim() || story.organization?.trim()) &&
      story.context?.trim() &&
      story.actions.length > 0
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

function scoreTransferableExperience(
  experience: ExperienceEvidenceCard,
  positioningStrategy: PositioningStrategy
) {
  const text = [
    experience.role,
    experience.organization,
    experience.context,
    ...experience.actions,
    experience.outcome ?? "",
    ...experience.skills,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const match of positioningStrategy.transferableMatches) {
    if (
      text.includes(match.resumeEvidence.toLowerCase()) ||
      text.includes(match.jobNeed.toLowerCase()) ||
      text.includes(match.bridgeExplanation.toLowerCase().split(" ")[0] ?? "")
    ) {
      score += 4;
    }
  }

  for (const strength of positioningStrategy.adjacentStrengths) {
    if (text.includes(strength.toLowerCase().split(" ")[0] ?? "")) {
      score += 2;
    }
  }

  if (/workflow|process|support|documentation|customer|sql|database|data|cross-functional/i.test(text)) {
    score += 2;
  }

  return score;
}
