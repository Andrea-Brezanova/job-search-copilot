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

describe("PUT /api/applications/[id]", () => {
  it("marks an application as applied", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const application = createApplicationRecord({ id: "app-1", user_id: user.id });
    const updated = createApplicationRecord({
      ...application,
      status: "applied",
      applied_at: "2026-05-09T12:00:00.000Z",
    });

    routeMocks.getApplicationById.mockResolvedValue(application);
    routeMocks.updateApplicationById.mockResolvedValue(updated);

    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "mark_applied" }),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.updateApplicationById).toHaveBeenCalledWith(
      "app-1",
      user.id,
      expect.objectContaining({
        status: "applied",
        appliedAt: expect.any(String),
      }),
    );
    await expect(response.json()).resolves.toEqual(updated);
  });

  it("sets a follow-up date and backfills applied_at when needed", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const application = createApplicationRecord({
      id: "app-1",
      user_id: user.id,
    });
    const updated = createApplicationRecord({
      ...application,
      status: "applied",
      applied_at: "2026-05-09T12:00:00.000Z",
      follow_up_at: "2026-05-16T12:00:00.000Z",
    });

    routeMocks.getApplicationById.mockResolvedValue(application);
    routeMocks.updateApplicationById.mockResolvedValue(updated);

    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "set_follow_up" }),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.updateApplicationById).toHaveBeenCalledWith(
      "app-1",
      user.id,
      expect.objectContaining({
        status: "applied",
        appliedAt: expect.any(String),
        followUpAt: expect.any(String),
      }),
    );
    await expect(response.json()).resolves.toEqual(updated);
  });

  it("moves an application to interview", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const application = createApplicationRecord({ id: "app-1", user_id: user.id });
    const updated = createApplicationRecord({
      ...application,
      status: "interview",
    });

    routeMocks.getApplicationById.mockResolvedValue(application);
    routeMocks.updateApplicationById.mockResolvedValue(updated);

    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "move_to_interview" }),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.updateApplicationById).toHaveBeenCalledWith(
      "app-1",
      user.id,
      expect.objectContaining({
        status: "interview",
      }),
    );
  });

  it("returns 401 for an unauthenticated update", async () => {
    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        body: JSON.stringify({ action: "mark_applied" }),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Please log in to update this application.",
    });
  });

  it("returns 404 when another user tries to update the application", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    routeMocks.getApplicationById.mockResolvedValue(null);

    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "mark_applied" }),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Application not found.",
    });
  });

  it("returns 400 for an invalid action", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const application = createApplicationRecord({ id: "app-1", user_id: user.id });
    routeMocks.getApplicationById.mockResolvedValue(application);

    const { PUT } = await import("@/app/api/applications/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "not_real" }),
      }),
      createParams("app-1"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid application action.",
    });
    expect(routeMocks.updateApplicationById).not.toHaveBeenCalled();
  });

  it("is idempotent when mark_applied is called twice", async () => {
    const user = registerMockUser(createMockUser({ id: "user-a" }));
    const state = {
      application: createApplicationRecord({ id: "app-1", user_id: user.id }),
    };

    routeMocks.getApplicationById.mockImplementation(async () => state.application);
    routeMocks.updateApplicationById.mockImplementation(async (_id, _userId, updates) => {
      state.application = {
        ...state.application,
        status: updates.status ?? state.application.status,
        applied_at: updates.appliedAt ?? state.application.applied_at,
      };
      return state.application;
    });

    const { PUT } = await import("@/app/api/applications/[id]/route");

    await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "mark_applied" }),
      }),
      createParams("app-1"),
    );

    const firstAppliedAt = state.application.applied_at;

    await PUT(
      new Request("http://localhost/api/applications/app-1", {
        method: "PUT",
        headers: createMockAuthHeader(user.id),
        body: JSON.stringify({ action: "mark_applied" }),
      }),
      createParams("app-1"),
    );

    expect(state.application.status).toBe("applied");
    expect(state.application.applied_at).toBe(firstAppliedAt);
    expect(routeMocks.updateApplicationById).toHaveBeenCalledTimes(2);
  });
});
