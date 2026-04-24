// This file centralizes the shared TypeScript interfaces used across the app.
export type ApplicationStatus = "draft" | "applied" | "interview" | "rejected";

export interface ParsedProfile {
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

export interface GeneratedApplicationContent {
  coverLetter: string;
  applicationEmail: string;
  applicationSummary: string;
  qualityNotes: ApplicationQualityNotes;
}

export interface RequirementMatch {
  requirement: string;
  matchedSkills: string[];
  evidence: string[];
}

export interface ApplicationTailoringContext {
  roleTitle: string;
  companyName?: string;
  topRequirements: string[];
  matchedRequirements: RequirementMatch[];
  missingRequirements: string[];
  resumeHighlights: string[];
  fitReasoning: string;
}

export interface ApplicationPackage {
  documents: ApplicationDocs;
  fitAnalysis: FitAnalysis;
  parsedJob: ParsedJob;
  applicationSummary?: string;
  qualityNotes?: ApplicationQualityNotes;
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
  userId?: string | null;
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
