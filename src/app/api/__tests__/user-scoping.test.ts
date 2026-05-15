import { describe, expect, it } from "vitest";
import {
  createApplicationRecord,
  createMockAuthHeader,
  createMockUser,
  createResumeRecord,
  registerMockUser,
  routeMocks,
} from "./setup";

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("user scoping across protected endpoints", () => {
  it("returns only the current user's applications from GET /api/applications", async () => {
    const userA = registerMockUser(createMockUser({ id: "user-a" }));
    const userB = registerMockUser(createMockUser({ id: "user-b" }));

    routeMocks.listApplications.mockImplementation(async (userId: string) => {
      if (userId === userA.id) {
        return [createApplicationRecord({ id: "app-a", user_id: userA.id })];
      }

      if (userId === userB.id) {
        return [createApplicationRecord({ id: "app-b", user_id: userB.id })];
      }

      return [];
    });

    const { GET } = await import("@/app/api/applications/route");
    const response = await GET(
      new Request("http://localhost/api/applications", {
        headers: createMockAuthHeader(userB.id),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: "app-b",
        user_id: userB.id,
      }),
    ]);
  });

  it("returns 404 when User B tries to update User A's application", async () => {
    const userB = registerMockUser(createMockUser({ id: "user-b" }));
    routeMocks.getApplicationById.mockResolvedValue(null);

    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-a", {
        method: "PUT",
        headers: createMockAuthHeader(userB.id),
        body: JSON.stringify({ action: "mark_applied" }),
      }),
      createParams("app-a"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Application not found.",
    });
  });

  it("returns only the current user's default resume", async () => {
    const userA = registerMockUser(createMockUser({ id: "user-a" }));
    const userB = registerMockUser(createMockUser({ id: "user-b" }));

    routeMocks.getDefaultResume.mockImplementation(async (userId: string) => {
      if (userId === userA.id) {
        return createResumeRecord({ id: "resume-a", user_id: userA.id });
      }

      if (userId === userB.id) {
        return createResumeRecord({ id: "resume-b", user_id: userB.id });
      }

      return null;
    });

    const { GET } = await import("@/app/api/resume-default/route");
    const response = await GET(
      new Request("http://localhost/api/resume-default", {
        headers: createMockAuthHeader(userB.id),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      resume: expect.objectContaining({
        id: "resume-b",
        user_id: userB.id,
      }),
    });
  });
});
