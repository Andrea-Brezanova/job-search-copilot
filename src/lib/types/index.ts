// This file centralizes the shared TypeScript interfaces used across the app.
export interface ParsedProfile {
  summary: string;
  skills: string[];
  experienceLevel: string;
  targetRoles: string[];
}

export interface ParsedJob {
  title: string;
  company?: string;
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
