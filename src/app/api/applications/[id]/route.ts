// This file returns a single application and supports draft updates.
import { NextResponse } from "next/server";
import {
  getApplicationById,
  updateApplicationById
} from "@/lib/db/queries";
import { getAuthenticatedSupabaseUser } from "@/lib/db/supabase";
import type { ApplicationStatus } from "@/lib/types";

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
      coverLetterDraft?: string;
      emailDraft?: string;
      status?: ApplicationStatus;
      notes?: string | null;
    };

    const updatedApplication = await updateApplicationById(id, user.id, body);
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
