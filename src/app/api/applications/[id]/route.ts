// This file returns a single application and supports draft updates.
import { NextResponse } from "next/server";
import { buildApplicationActionUpdate } from "@/lib/applications/actionUpdates";
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

    const actionUpdates = body.action
      ? buildApplicationActionUpdate(body.action as ApplicationUpdateAction, application)
      : {};

    const updatedApplication = await updateApplicationById(id, user.id, {
      coverLetterDraft: body.coverLetterDraft,
      emailDraft: body.emailDraft,
      followUpEmailDraft: body.followUpEmailDraft,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      jobUrl: body.jobUrl,
      notes: body.notes,
      ...actionUpdates,
    });
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
