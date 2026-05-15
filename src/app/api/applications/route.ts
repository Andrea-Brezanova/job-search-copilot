// This file lists saved applications and creates new ones.
import { NextResponse } from "next/server";
import {
  listApplications,
  saveGeneratedApplication
} from "@/lib/db/queries";
import { getAuthenticatedSupabaseUser } from "@/lib/db/supabase";
import { debugLog } from "@/lib/logging";
import type {
  ApplicationDocs,
  ApplicationStatus,
  FitAnalysis,
  ParsedProfile,
  ParsedJob
} from "@/lib/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to view your saved applications." },
        { status: 401 }
      );
    }

    const applications = await listApplications(user.id);
    return NextResponse.json(applications);
  } catch (error) {
    console.error("applications GET error", error);

    return NextResponse.json(
      {
        error: "Unable to load applications.",
        details: getErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to save your application." },
        { status: 401 }
      );
    }

    const startedAt = Date.now();
    const body = (await request.json()) as {
      profileText?: string;
      uploadedFileName?: string | null;
      jobDescription?: string;
      fitAnalysis?: FitAnalysis;
      parsedProfile?: ParsedProfile;
      parsedJob?: ParsedJob;
      documents?: ApplicationDocs;
      status?: ApplicationStatus;
      notes?: string | null;
    };

    if (!body.profileText?.trim() || !body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Please add your resume / CV and the job description." },
        { status: 400 }
      );
    }

    if (!body.fitAnalysis || !body.documents) {
      return NextResponse.json(
        { error: "Generate an application package before saving." },
        { status: 400 }
      );
    }

    if (!body.parsedProfile || !body.parsedJob) {
      return NextResponse.json(
        { error: "We could not save this application right now. Please try generating it again." },
        { status: 400 }
      );
    }

    const saveStartedAt = Date.now();
    const savedApplication = await saveGeneratedApplication({
      userId: user.id,
      resumeFileName: body.uploadedFileName ?? null,
      rawResumeText: body.profileText,
      rawJobText: body.jobDescription,
      parsedResume: body.parsedProfile,
      parsedJob: body.parsedJob,
      fitAnalysis: body.fitAnalysis,
      coverLetterDraft: body.documents.coverLetter,
      emailDraft: body.documents.applicationEmail,
      status: body.status ?? "draft",
      notes: body.notes ?? null
    });
    debugLog("application-save-db-ms", Date.now() - saveStartedAt);
    debugLog("application-save-total-ms", Date.now() - startedAt);

    return NextResponse.json(savedApplication, { status: 201 });
  } catch (error) {
    console.error("applications POST error", error);

    return NextResponse.json(
      {
        error: "Unable to save the application.",
        details: getErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
