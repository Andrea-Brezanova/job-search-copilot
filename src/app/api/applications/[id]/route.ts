// This file returns a single application and supports draft updates.
import { NextResponse } from "next/server";
import {
  buildApplicationActionUpdate,
  effectiveIsoTimestamp,
} from "@/lib/applications/actionUpdates";
import {
  getApplicationById,
  updateApplicationById
} from "@/lib/db/queries";
import { getAuthenticatedSupabaseUser } from "@/lib/db/supabase";
import type { ApplicationUpdateAction } from "@/lib/types";

const validApplicationActions = new Set<ApplicationUpdateAction>([
  "mark_applied",
  "set_follow_up",
  "move_to_interview",
  "mark_rejected",
  "archive",
]);

const MAX_ACTION_REPAIR_ATTEMPTS = 2;

function addDays(isoDate: string, days: number) {
  const nextDate = new Date(isoDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function isoInstantsEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = effectiveIsoTimestamp(a);
  const right = effectiveIsoTimestamp(b);

  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const tLeft = new Date(left).getTime();
  const tRight = new Date(right).getTime();

  if (Number.isNaN(tLeft) || Number.isNaN(tRight)) {
    return false;
  }

  return tLeft === tRight;
}

function ensureActionSideEffects(
  action: ApplicationUpdateAction,
  application: Awaited<ReturnType<typeof getApplicationById>>,
  updates: ReturnType<typeof buildApplicationActionUpdate>,
) {
  if (!application) {
    return updates;
  }

  if (action === "mark_applied") {
    const appliedAt =
      effectiveIsoTimestamp(updates.appliedAt) ??
      effectiveIsoTimestamp(application.applied_at) ??
      new Date().toISOString();

    return {
      ...updates,
      appliedAt,
      followUpAt:
        effectiveIsoTimestamp(updates.followUpAt) ??
        effectiveIsoTimestamp(application.follow_up_at) ??
        addDays(appliedAt, 7),
    };
  }

  if (action === "set_follow_up") {
    const appliedAt =
      effectiveIsoTimestamp(updates.appliedAt) ??
      effectiveIsoTimestamp(application.applied_at) ??
      new Date().toISOString();

    return {
      ...updates,
      appliedAt,
      followUpAt:
        effectiveIsoTimestamp(updates.followUpAt) ??
        effectiveIsoTimestamp(application.follow_up_at) ??
        addDays(appliedAt, 7),
    };
  }

  return updates;
}

function getMissingPersistedActionUpdates(
  action: ApplicationUpdateAction,
  application: Awaited<ReturnType<typeof getApplicationById>>,
  updatedApplication: Awaited<ReturnType<typeof updateApplicationById>>,
  actionNow: Date,
) {
  if (!application) {
    return {};
  }

  const expectedUpdates = ensureActionSideEffects(
    action,
    application,
    buildApplicationActionUpdate(action, application, actionNow),
  );

  const missingUpdates: {
    appliedAt?: string;
    followUpAt?: string;
  } = {};

  const expectedAppliedAt = effectiveIsoTimestamp(expectedUpdates.appliedAt);
  const expectedFollowUpAt = effectiveIsoTimestamp(expectedUpdates.followUpAt);

  if (
    expectedAppliedAt &&
    !isoInstantsEqual(updatedApplication.applied_at, expectedAppliedAt)
  ) {
    missingUpdates.appliedAt = expectedAppliedAt;
  }

  if (
    expectedFollowUpAt &&
    !isoInstantsEqual(updatedApplication.follow_up_at, expectedFollowUpAt)
  ) {
    missingUpdates.followUpAt = expectedFollowUpAt;
  }

  return missingUpdates;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to view this application." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const application = await getApplicationById(id, user.id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("application detail GET error", error);

    return NextResponse.json(
      {
        error: "Unable to load the application.",
        details: getErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to update this application." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      coverLetterDraft?: string;
      emailDraft?: string;
      followUpEmailDraft?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      jobUrl?: string | null;
      notes?: string | null;
    };

    const application = await getApplicationById(id, user.id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    if (body.action && !validApplicationActions.has(body.action as ApplicationUpdateAction)) {
      return NextResponse.json(
        { error: "Invalid application action." },
        { status: 400 }
      );
    }

    const actionReferenceNow = new Date();

    const actionUpdates = body.action
      ? ensureActionSideEffects(
          body.action as ApplicationUpdateAction,
          application,
          buildApplicationActionUpdate(
            body.action as ApplicationUpdateAction,
            application,
            actionReferenceNow,
          ),
        )
      : {};

    let updatedApplication = await updateApplicationById(id, user.id, {
      coverLetterDraft: body.coverLetterDraft,
      emailDraft: body.emailDraft,
      followUpEmailDraft: body.followUpEmailDraft,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      jobUrl: body.jobUrl,
      notes: body.notes,
      ...actionUpdates,
    });

    if (body.action) {
      let repairAttempts = 0;

      while (repairAttempts < MAX_ACTION_REPAIR_ATTEMPTS) {
        const missingPersistedActionUpdates = getMissingPersistedActionUpdates(
          body.action as ApplicationUpdateAction,
          application,
          updatedApplication,
          actionReferenceNow,
        );

        if (
          missingPersistedActionUpdates.appliedAt === undefined &&
          missingPersistedActionUpdates.followUpAt === undefined
        ) {
          break;
        }

        updatedApplication = await updateApplicationById(
          id,
          user.id,
          missingPersistedActionUpdates,
        );
        repairAttempts += 1;
      }
    }

    return NextResponse.json(updatedApplication);
  } catch (error) {
    console.error("application detail PUT error", error);

    return NextResponse.json(
      {
        error: "Unable to update the application.",
        details: getErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
