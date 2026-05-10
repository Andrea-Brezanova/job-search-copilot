import { describe, expect, it } from "vitest";
import {
  createApplicationRecord,
  createMockAuthHeader,
  createMockUser,
  registerMockUser,
  routeMocks,
} from "./setup";

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/applications/[id]/follow-up", () => {
  it("generates a follow-up email and saves it to the application", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const application = createApplicationRecord({ id: "app-1", user_id: user.id });
    const updated = createApplicationRecord({
      ...application,
      follow_up_email_draft: "Following up on my application.",
    });

    routeMocks.getApplicationById.mockResolvedValue(application);
    routeMocks.generateStructuredOutput.mockResolvedValue({
      data: "Following up on my application.",
      error: "",
      wasOpenAIUsed: true,
      model: "test-model",
      rawResponse: "Following up on my application.",
    });
    routeMocks.updateApplicationById.mockResolvedValue(updated);

    const { POST } = await import("@/app/api/applications/[id]/follow-up/route");
    const response = await POST(
      new Request("http://localhost/api/applications/app-1/follow-up", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.generateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        outputType: "text",
      }),
    );
    expect(routeMocks.updateApplicationById).toHaveBeenCalledWith(
      "app-1",
      user.id,
      { followUpEmailDraft: "Following up on my application." },
    );
    await expect(response.json()).resolves.toEqual({
      application: updated,
      followUpEmailDraft: "Following up on my application.",
      debug: {
        wasOpenAIUsed: true,
        model: "test-model",
      },
    });
  });

  it("returns 401 when the user is unauthenticated", async () => {
    const { POST } = await import("@/app/api/applications/[id]/follow-up/route");
    const response = await POST(
      new Request("http://localhost/api/applications/app-1/follow-up", {
        method: "POST",
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Please log in to generate a follow-up email.",
    });
  });

  it("returns 404 for a missing application", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    routeMocks.getApplicationById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/applications/[id]/follow-up/route");
    const response = await POST(
      new Request("http://localhost/api/applications/app-1/follow-up", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Application not found.",
    });
  });

  it("returns 404 when another user tries to generate a follow-up email", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    routeMocks.getApplicationById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/applications/[id]/follow-up/route");
    const response = await POST(
      new Request("http://localhost/api/applications/app-1/follow-up", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Application not found.",
    });
  });

  it("returns a graceful 500 when the LLM call times out", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const application = createApplicationRecord({ id: "app-1", user_id: user.id });

    routeMocks.getApplicationById.mockResolvedValue(application);
    routeMocks.generateStructuredOutput.mockRejectedValue(
      new Error("OpenAI request timed out."),
    );

    const { POST } = await import("@/app/api/applications/[id]/follow-up/route");
    const response = await POST(
      new Request("http://localhost/api/applications/app-1/follow-up", {
        method: "POST",
        headers: createMockAuthHeader(user.id),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to generate the follow-up email.",
      details: "OpenAI request timed out.",
    });
  });
});
