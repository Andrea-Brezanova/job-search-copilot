import { describe, expect, it } from "vitest";
import { createApplicationRecord } from "@/app/api/__tests__/setup";
import {
  defaultFollowUpIsoFromAppliedAt,
  mergePersistedFollowUpAfterSetAction,
} from "../markAppliedFollowUp";

describe("defaultFollowUpIsoFromAppliedAt", () => {
  it("adds 7 calendar days to the applied instant", () => {
    expect(defaultFollowUpIsoFromAppliedAt("2026-05-09T12:00:00.000Z")).toBe(
      "2026-05-16T12:00:00.000Z",
    );
  });
});

describe("mergePersistedFollowUpAfterSetAction", () => {
  it("returns persisted row when follow_up_at is present", () => {
    const persisted = createApplicationRecord({
      follow_up_at: "2026-05-20T00:00:00.000Z",
    });
    const merged = mergePersistedFollowUpAfterSetAction(
      persisted,
      "2026-05-16T12:00:00.000Z",
    );
    expect(merged.follow_up_at).toBe("2026-05-20T00:00:00.000Z");
  });

  it("keeps optimistic follow_up_at when persisted has none", () => {
    const persisted = createApplicationRecord({
      follow_up_at: null,
    });
    const merged = mergePersistedFollowUpAfterSetAction(
      persisted,
      "2026-05-16T12:00:00.000Z",
    );
    expect(merged.follow_up_at).toBe("2026-05-16T12:00:00.000Z");
  });

  it("treats blank follow_up_at as missing and keeps optimistic", () => {
    const persisted = createApplicationRecord({
      follow_up_at: "",
    });
    const merged = mergePersistedFollowUpAfterSetAction(
      persisted,
      "2026-05-16T12:00:00.000Z",
    );
    expect(merged.follow_up_at).toBe("2026-05-16T12:00:00.000Z");
  });
});
