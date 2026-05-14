import { describe, expect, it } from "vitest";
import { buildApplicationActionUpdate } from "@/lib/applications/actionUpdates";

describe("buildApplicationActionUpdate", () => {
  const baseApplication = {
    applied_at: null,
    follow_up_at: null,
    archived_at: null,
    status: "draft" as const,
  };

  it("mark_applied sets applied_at and follow_up_at when both are missing", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate("mark_applied", baseApplication, now),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-04T12:00:00.000Z",
      followUpAt: "2026-05-11T12:00:00.000Z",
    });
  });

  it("mark_applied treats blank follow_up_at as missing and sets a default", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate(
        "mark_applied",
        { ...baseApplication, follow_up_at: "" },
        now,
      ),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-04T12:00:00.000Z",
      followUpAt: "2026-05-11T12:00:00.000Z",
    });
  });

  it("mark_applied treats blank applied_at as missing when computing follow-up", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate(
        "mark_applied",
        { ...baseApplication, applied_at: "  " },
        now,
      ),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-04T12:00:00.000Z",
      followUpAt: "2026-05-11T12:00:00.000Z",
    });
  });

  it("mark_applied preserves existing follow_up_at", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate(
        "mark_applied",
        {
          ...baseApplication,
          follow_up_at: "2026-05-20T09:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-04T12:00:00.000Z",
      followUpAt: "2026-05-20T09:00:00.000Z",
    });
  });

  it("maps set_follow_up to applied plus seven days and backfills applied status", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate("set_follow_up", baseApplication, now),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-04T12:00:00.000Z",
      followUpAt: "2026-05-11T12:00:00.000Z",
    });
  });

  it("preserves existing timestamps when the action is clicked again", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate(
        "mark_applied",
        {
          ...baseApplication,
          applied_at: "2026-05-01T09:00:00.000Z",
          follow_up_at: "2026-05-08T09:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-01T09:00:00.000Z",
      followUpAt: "2026-05-08T09:00:00.000Z",
    });
  });
});
