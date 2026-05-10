import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/supabase", () => ({
  getSupabaseServerClient,
}));

import {
  getDefaultResume,
  getApplicationById,
  listApplications,
  saveDefaultResume,
  saveGeneratedApplication,
  updateApplicationById,
} from "@/lib/db/queries";

function createSelectChain(result: { data: unknown; error: unknown }) {
  const chain = {
    data: result.data,
    error: result.error,
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  return chain;
}

describe("db queries user scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveGeneratedApplication requires userId", async () => {
    await expect(
      saveGeneratedApplication({
        rawResumeText: "resume",
        rawJobText: "job",
        parsedResume: {
          name: "",
          summary: "",
          skills: [],
          experienceLevel: "Junior",
          targetRoles: [],
          highlights: [],
          keywords: [],
        },
        parsedJob: {
          title: "Role",
          responsibilities: [],
          requirements: [],
          keywords: [],
        },
        fitAnalysis: {
          fitScore: 0,
          strengths: [],
          gaps: [],
          recommendation: "Skip",
          reasoning: "",
        },
        coverLetterDraft: "cover",
        emailDraft: "email",
        status: "draft",
      } as never)
    ).rejects.toThrow("saveGeneratedApplication requires a userId.");
  });

  it("saveGeneratedApplication reuses an existing matching resume snapshot", async () => {
    const existingResumeChain = createSelectChain({
      data: {
        id: "resume-1",
        user_id: "user-123",
        raw_resume_text: "resume",
      },
      error: null,
    });
    const applicationsInsertChain = createSelectChain({
      data: { id: "app-1", user_id: "user-123", resume_id: "resume-1" },
      error: null,
    });
    const from = vi.fn((table: string) => {
      if (table === "resumes") {
        return existingResumeChain;
      }

      return applicationsInsertChain;
    });

    getSupabaseServerClient.mockReturnValue({ from });

    await saveGeneratedApplication({
      userId: "user-123",
      rawResumeText: "resume",
      rawJobText: "job",
      parsedResume: {
        name: "",
        summary: "",
        skills: [],
        experienceLevel: "Junior",
        targetRoles: [],
        highlights: [],
        keywords: [],
      },
      parsedJob: {
        title: "Role",
        responsibilities: [],
        requirements: [],
        keywords: [],
      },
      fitAnalysis: {
        fitScore: 0,
        strengths: [],
        gaps: [],
        recommendation: "Skip",
        reasoning: "",
      },
      coverLetterDraft: "cover",
      emailDraft: "email",
      status: "draft",
    });

    expect(existingResumeChain.insert).not.toHaveBeenCalled();
    expect(applicationsInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        resume_id: "resume-1",
      }),
    );
  });

  it("listApplications filters by userId", async () => {
    const chain = createSelectChain({ data: [], error: null });
    getSupabaseServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    await listApplications("user-123");

    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("saveDefaultResume requires userId", async () => {
    await expect(saveDefaultResume("", "resume")).rejects.toThrow(
      "saveDefaultResume requires a userId.",
    );
  });

  it("getDefaultResume returns only the current user's resume", async () => {
    const chain = createSelectChain({ data: null, error: null });
    getSupabaseServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    await getDefaultResume("user-123");

    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(chain.order).toHaveBeenNthCalledWith(1, "is_default", {
      ascending: false,
    });
    expect(chain.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it("getApplicationById filters by id and userId", async () => {
    const chain = createSelectChain({ data: null, error: null });
    getSupabaseServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    await getApplicationById("app-1", "user-123");

    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "app-1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");
  });

  it("updateApplicationById filters by id and userId", async () => {
    const chain = createSelectChain({
      data: { id: "app-1", user_id: "user-123" },
      error: null,
    });
    getSupabaseServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    await updateApplicationById("app-1", "user-123", {
      status: "applied",
    });

    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "app-1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");
  });

  it("updateApplicationById maps follow-up email draft updates", async () => {
    const chain = createSelectChain({
      data: { id: "app-1", user_id: "user-123" },
      error: null,
    });
    getSupabaseServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    await updateApplicationById("app-1", "user-123", {
      followUpEmailDraft: "Following up on my application...",
    });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        follow_up_email_draft: "Following up on my application...",
      }),
    );
  });

  it("updateApplicationById maps contact metadata updates", async () => {
    const chain = createSelectChain({
      data: { id: "app-1", user_id: "user-123" },
      error: null,
    });
    getSupabaseServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    await updateApplicationById("app-1", "user-123", {
      contactName: "Taylor Kim",
      contactEmail: "taylor@example.com",
      jobUrl: "https://company.example/jobs/123",
    });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_name: "Taylor Kim",
        contact_email: "taylor@example.com",
        job_url: "https://company.example/jobs/123",
      }),
    );
  });
});
