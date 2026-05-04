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
});
