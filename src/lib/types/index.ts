// This file centralizes the shared TypeScript interfaces used across the app.
export type ApplicationStatus =
  | "draft"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";

export interface ParsedProfile {
  name: string;
  summary: string;
  skills: string[];
  experienceLevel: string;
  targetRoles: string[];
  highlights: string[];
  keywords: string[];
}

export interface ParsedJob {
  title: string;
  company?: string;
  locationText?: string;
  responsibilities: string[];
  requirements: string[];
  keywords: string[];
}

export interface FitAnalysis {
  fitScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: "Apply" | "Maybe" | "Skip";
  reasoning: string;
}

export interface ApplicationDocs {
  coverLetter: string;
  applicationEmail: string;
}

export interface ApplicationQualityNotes {
  factsUsedFromResume: string[];
  jobRequirementsAddressed: string[];
  growthAreasPhrasedCarefully: string[];
}

export interface ExperienceEvidenceCard {
  role: string;
  organization: string;
  context: string;
  actions: string[];
  outcome?: string;
  skills: string[];
}

export interface PositioningMatch {
  jobNeed: string;
  resumeEvidence: string;
}

export interface TransferablePositioningMatch extends PositioningMatch {
  bridgeExplanation: string;
}

export interface PositioningGap {
  requirement: string;
  severity: "low" | "medium" | "high";
  handlingStrategy: string;
}

export interface PositioningStrategy {
  matchLevel: "strong" | "partial" | "transferable" | "weak";
  generationMode:
    | "strong_match"
    | "partial_match"
    | "transferable_positioning"
    | "honest_stretch";
  directMatches: PositioningMatch[];
  transferableMatches: TransferablePositioningMatch[];
  adjacentStrengths: string[];
  gaps: PositioningGap[];
  strongestApplicationAngle: string;
  recommendedTone:
    | "direct_match"
    | "junior_growth"
    | "career_transition"
    | "transferable_skills"
    | "high_motivation";
  coverLetterStrategy: string;
  evidenceToUse: string[];
  claimsToAvoid: string[];
}

export interface ApplicationBrief {
  candidateSummary: string;
  jobSummary: string;
  matchLevel: "strong" | "partial" | "transferable" | "weak";
  strongestSellingPoints: string[];
  relevantResumeEvidence: string[];
  transferableAngles: string[];
  companyOrRoleMotivation: string[];
  gapsToHandleCarefully: string[];
  claimsToAvoid: string[];
  recommendedTone: string;
  coverLetterOutline: string[];
  emailOutline: string[];
}

export interface CoverLetterInput {
  company?: string;
  role: string;
  responsibilityThemes: string[];
  primaryStory: ExperienceEvidenceCard;
  secondaryStory?: ExperienceEvidenceCard;
  supportedSkills: string[];
  growthAreas: string[];
  candidateName: string;
  candidateEmail: string;
}

export interface GeneratedApplicationContent {
  cover_letter: string;
  email_text: string;
  application_summary: string;
}

export interface ApplicationPackage {
  documents: ApplicationDocs;
  fitAnalysis: FitAnalysis;
  parsedJob: ParsedJob;
  applicationSummary?: string;
  qualityNotes?: ApplicationQualityNotes;
  positioningStrategy?: PositioningStrategy;
  applicationBrief?: ApplicationBrief;
}

export interface PreferenceRecord {
  id: string;
  user_id: string | null;
  target_roles_json: string[] | null;
  preferred_locations_json: string[] | null;
  work_mode_preference: string | null;
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  languages_json: string[] | null;
  cover_letter_tone: string | null;
  email_tone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeRecord {
  id: string;
  user_id: string | null;
  file_name: string | null;
  raw_resume_text: string;
  parsed_resume_json: ParsedProfile | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRecord {
  id: string;
  user_id: string | null;
  resume_id: string | null;
  job_source_type: string;
  job_url: string | null;
  raw_job_text: string;
  parsed_job_json: ParsedJob | null;
  company_name: string | null;
  role_title: string;
  location_text: string | null;
  fit_summary: string | null;
  fit_score: number | null;
  cover_letter_draft: string;
  email_draft: string;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationInput {
  userId: string;
  resumeFileName?: string | null;
  rawResumeText: string;
  rawJobText: string;
  parsedResume: ParsedProfile;
  parsedJob: ParsedJob;
  fitAnalysis: FitAnalysis;
  coverLetterDraft: string;
  emailDraft: string;
  status: ApplicationStatus;
  notes?: string | null;
}

export interface UpdateApplicationInput {
  coverLetterDraft?: string;
  emailDraft?: string;
  status?: ApplicationStatus;
  notes?: string | null;
}
