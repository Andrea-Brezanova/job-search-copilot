import { describe, expect, it } from "vitest";
import {
  createApplicationRecord,
  createDocuments,
  createFitAnalysis,
  createMockAuthHeader,
  createMockUser,
  createParsedJob,
  createParsedProfile,
  registerMockUser,
  routeMocks,
} from "./setup";

describe("POST /api/applications", () => {
  it("returns 201 and saves an authenticated application with the current user id", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const savedApplication = createApplicationRecord({ user_id: user.id });
    routeMocks.saveGeneratedApplication.mockResolvedValue(savedApplication);

    const { POST } = await import("@/app/api/applications/route");
    const response = await POST(
      new Request("http://localhost/api/applications", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({
          profileText: "Resume text",
          uploadedFileName: "resume.pdf",
          jobDescription: "Job description",
          fitAnalysis: createFitAnalysis(),
          parsedProfile: createParsedProfile(),
          parsedJob: createParsedJob(),
          documents: createDocuments(),
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.saveGeneratedApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        rawResumeText: "Resume text",
        rawJobText: "Job description",
      }),
    );
    await expect(response.json()).resolves.toEqual(savedApplication);
  });

  it("returns 401 for an unauthenticated save request", async () => {
    const { POST } = await import("@/app/api/applications/route");
    const response = await POST(
      new Request("http://localhost/api/applications", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Please log in to save your application.",
    });
  });

  it("returns 400 when the resume text is missing", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const { POST } = await import("@/app/api/applications/route");

    const response = await POST(
      new Request("http://localhost/api/applications", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({
          profileText: "   ",
          jobDescription: "Job description",
          fitAnalysis: createFitAnalysis(),
          parsedProfile: createParsedProfile(),
          parsedJob: createParsedJob(),
          documents: createDocuments(),
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please add your resume / CV and the job description.",
    });
  });

  it("returns 400 when the job description is missing", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const { POST } = await import("@/app/api/applications/route");

    const response = await POST(
      new Request("http://localhost/api/applications", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({
          profileText: "Resume text",
          jobDescription: "  ",
          fitAnalysis: createFitAnalysis(),
          parsedProfile: createParsedProfile(),
          parsedJob: createParsedJob(),
          documents: createDocuments(),
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please add your resume / CV and the job description.",
    });
  });

  it("keeps saves user-scoped across POST and GET", async () => {
    const userA = registerMockUser(createMockUser({ id: "user-a" }));
    const userB = registerMockUser(createMockUser({ id: "user-b" }));
    const applications = new Map<string, ReturnType<typeof createApplicationRecord>[]>([
      [userA.id, []],
      [userB.id, []],
    ]);

    routeMocks.saveGeneratedApplication.mockImplementation(async (input) => {
      const saved = createApplicationRecord({
        id: `app-${applications.get(input.userId)?.length ?? 0}`,
        user_id: input.userId,
      });
      applications.get(input.userId)?.push(saved);
      return saved;
    });
    routeMocks.listApplications.mockImplementation(async (userId: string) => {
      return applications.get(userId) ?? [];
    });

    const { GET, POST } = await import("@/app/api/applications/route");

    await POST(
      new Request("http://localhost/api/applications", {
        method: "POST",
        headers: createMockAuthHeader(userA.id),
        body: JSON.stringify({
          profileText: "Resume text",
          jobDescription: "Job description",
          fitAnalysis: createFitAnalysis(),
          parsedProfile: createParsedProfile(),
          parsedJob: createParsedJob(),
          documents: createDocuments(),
        }),
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/applications", {
        headers: createMockAuthHeader(userB.id),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(routeMocks.listApplications).toHaveBeenCalledWith(userB.id);
  });
});
