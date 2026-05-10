import { beforeEach, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type {
  ApplicationDocs,
  ApplicationRecord,
  FitAnalysis,
  ParsedJob,
  ParsedProfile,
  ResumeRecord,
} from "@/lib/types";

const mocks = vi.hoisted(() => ({
  authUsersById: new Map<string, User>(),
  getAuthenticatedSupabaseUser: vi.fn(),
  listApplications: vi.fn(),
  saveGeneratedApplication: vi.fn(),
  getApplicationById: vi.fn(),
  updateApplicationById: vi.fn(),
  getDefaultResume: vi.fn(),
  saveDefaultResume: vi.fn(),
  generateStructuredOutput: vi.fn(),
}));

vi.mock("@/lib/db/supabase", () => ({
  getAuthenticatedSupabaseUser: mocks.getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/db/queries", () => ({
  listApplications: mocks.listApplications,
  saveGeneratedApplication: mocks.saveGeneratedApplication,
  getApplicationById: mocks.getApplicationById,
  updateApplicationById: mocks.updateApplicationById,
  getDefaultResume: mocks.getDefaultResume,
  saveDefaultResume: mocks.saveDefaultResume,
}));

vi.mock("@/lib/llm/client", () => ({
  generateStructuredOutput: mocks.generateStructuredOutput,
}));

export const routeMocks = {
  getAuthenticatedSupabaseUser: mocks.getAuthenticatedSupabaseUser,
  listApplications: mocks.listApplications,
  saveGeneratedApplication: mocks.saveGeneratedApplication,
  getApplicationById: mocks.getApplicationById,
  updateApplicationById: mocks.updateApplicationById,
  getDefaultResume: mocks.getDefaultResume,
  saveDefaultResume: mocks.saveDefaultResume,
  generateStructuredOutput: mocks.generateStructuredOutput,
};

export function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? "user-1";

  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    email: `${id}@example.com`,
    ...overrides,
  } as User;
}

export function registerMockUser(user: User) {
  mocks.authUsersById.set(user.id, user);
  return user;
}

export function createMockAuthHeader(userId: string) {
  return {
    Authorization: `Bearer token-${userId}`,
  };
}

export function createParsedProfile(overrides: Partial<ParsedProfile> = {}): ParsedProfile {
  return {
    name: "Test User",
    summary: "Backend-focused engineer.",
    skills: ["TypeScript", "SQL"],
    experienceLevel: "Mid",
    targetRoles: ["Software Engineer"],
    highlights: [],
    keywords: ["typescript", "sql"],
    ...overrides,
  };
}

export function createParsedJob(overrides: Partial<ParsedJob> = {}): ParsedJob {
  return {
    title: "Software Engineer",
    company: "Acme",
    locationText: "Remote",
    responsibilities: ["Build internal tools"],
    requirements: ["TypeScript"],
    keywords: ["typescript"],
    ...overrides,
  };
}

export function createFitAnalysis(overrides: Partial<FitAnalysis> = {}): FitAnalysis {
  return {
    fitScore: 82,
    strengths: ["TypeScript"],
    gaps: [],
    recommendation: "Apply",
    reasoning: "Good fit.",
    ...overrides,
  };
}

export function createDocuments(overrides: Partial<ApplicationDocs> = {}): ApplicationDocs {
  return {
    coverLetter: "Cover letter draft",
    applicationEmail: "Application email draft",
    ...overrides,
  };
}

export function createApplicationRecord(
  overrides: Partial<ApplicationRecord> = {},
): ApplicationRecord {
  return {
    id: "app-1",
    user_id: "user-1",
    resume_id: "resume-1",
    job_source_type: "manual",
    job_url: "https://example.com/jobs/1",
    contact_name: null,
    contact_email: null,
    raw_job_text: "Build internal tools with TypeScript.",
    parsed_job_json: createParsedJob(),
    company_name: "Acme",
    role_title: "Software Engineer",
    location_text: "Remote",
    fit_summary: "Strong fit",
    fit_score: 82,
    cover_letter_draft: "Cover letter draft",
    email_draft: "Application email draft",
    follow_up_email_draft: null,
    status: "draft",
    notes: null,
    applied_at: null,
    follow_up_at: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createResumeRecord(
  overrides: Partial<ResumeRecord> = {},
): ResumeRecord {
  return {
    id: "resume-1",
    user_id: "user-1",
    file_name: "resume.pdf",
    raw_resume_text: "Saved resume text",
    parsed_resume_json: createParsedProfile(),
    is_default: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authUsersById.clear();

  mocks.getAuthenticatedSupabaseUser.mockImplementation(async (request: Request) => {
    const authHeader = request.headers.get("authorization") ?? "";
    const bearerMatch = authHeader.match(/^Bearer\s+token-(.+)$/i);
    const userId = bearerMatch?.[1]?.trim();

    if (!userId) {
      return null;
    }

    return mocks.authUsersById.get(userId) ?? null;
  });
});
