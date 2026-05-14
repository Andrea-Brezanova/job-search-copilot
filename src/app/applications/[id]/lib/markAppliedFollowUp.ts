import { effectiveIsoTimestamp } from "@/lib/applications/actionUpdates";
import type { ApplicationRecord } from "@/lib/types";

/** Same offset as `mark_applied` in actionUpdates: applied instant + 7 local calendar days. */
export function defaultFollowUpIsoFromAppliedAt(appliedAtIso: string): string {
  const followUp = new Date(appliedAtIso);
  followUp.setDate(followUp.getDate() + 7);
  return followUp.toISOString();
}

/**
 * After `set_follow_up`, use server row when it has a usable follow-up; otherwise keep optimistic.
 */
export function mergePersistedFollowUpAfterSetAction(
  persisted: ApplicationRecord,
  optimisticFollowUpAt: string,
): ApplicationRecord {
  if (effectiveIsoTimestamp(persisted.follow_up_at)) {
    return persisted;
  }

  return {
    ...persisted,
    follow_up_at: optimisticFollowUpAt,
  };
}
