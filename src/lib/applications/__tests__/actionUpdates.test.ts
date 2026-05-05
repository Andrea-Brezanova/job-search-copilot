import { describe, expect, it } from "vitest";
import { buildApplicationActionUpdate } from "@/lib/applications/actionUpdates";

describe("buildApplicationActionUpdate", () => {
  const baseApplication = {
    applied_at: null,
    follow_up_at: null,
    archived_at: null,
    status: "draft" as const,
  };

  it("maps mark_applied to applied status and timestamp", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate("mark_applied", baseApplication, now),
    ).toEqual({
      status: "applied",
      appliedAt: "2026-05-04T12:00:00.000Z",
    });
  });

  it("maps set_follow_up to seven days from now", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate("set_follow_up", baseApplication, now),
    ).toEqual({
      followUpAt: "2026-05-11T12:00:00.000Z",
    });
  });

  it("preserves existing timestamps when the action is clicked again", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");

    expect(
      buildApplicationActionUpdate(
        "archive",
        {
          ...baseApplication,
          archived_at: "2026-05-01T09:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      status: "archived",
      archivedAt: "2026-05-01T09:00:00.000Z",
    });
  });
});
