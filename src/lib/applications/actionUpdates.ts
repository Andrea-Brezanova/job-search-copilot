import type {
  ApplicationRecord,
  ApplicationUpdateAction,
  UpdateApplicationInput,
} from "@/lib/types";

/** Null, undefined, and blank strings are treated as "no timestamp" (DB/UI sentinels). */
export function effectiveIsoTimestamp(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

export function buildApplicationActionUpdate(
  action: ApplicationUpdateAction,
  application: Pick<
    ApplicationRecord,
    "applied_at" | "follow_up_at" | "archived_at" | "status"
  >,
  now = new Date(),
): UpdateApplicationInput {
  switch (action) {
    case "mark_applied": {
      const appliedAt = effectiveIsoTimestamp(application.applied_at) ?? now.toISOString();
      const followUpDate = new Date(appliedAt);
      followUpDate.setDate(followUpDate.getDate() + 7);

      return {
        status: "applied",
        appliedAt,
        followUpAt:
          effectiveIsoTimestamp(application.follow_up_at) ?? followUpDate.toISOString(),
      };
    }
    case "set_follow_up": {
      const appliedAt = effectiveIsoTimestamp(application.applied_at) ?? now.toISOString();
      const followUpDate = new Date(now);
      followUpDate.setDate(followUpDate.getDate() + 7);

      return {
        status: application.status === "draft" ? "applied" : application.status,
        appliedAt,
        followUpAt:
          effectiveIsoTimestamp(application.follow_up_at) ?? followUpDate.toISOString(),
      };
    }
    case "move_to_interview":
      return {
        status: "interview",
      };
    case "mark_rejected":
      return {
        status: "rejected",
      };
    case "archive":
      return {
        status: "archived",
        archivedAt: application.archived_at ?? now.toISOString(),
      };
  }
}
