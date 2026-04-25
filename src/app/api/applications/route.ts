// This file lists saved applications and creates new ones.
import { NextResponse } from "next/server";
import {
  listApplications,
  saveGeneratedApplication
} from "@/lib/db/queries";
import { parseProfileText } from "@/lib/engines/profileEngine";
import type {
  ApplicationDocs,
  ApplicationStatus,
  FitAnalysis,
  ParsedJob
} from "@/lib/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export async function GET() {
  try {
    const applications = await listApplications();
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
    const startedAt = Date.now();
    const body = (await request.json()) as {
      profileText?: string;
      uploadedFileName?: string | null;
      jobDescription?: string;
      fitAnalysis?: FitAnalysis;
      parsedJob?: ParsedJob;
      documents?: ApplicationDocs;
      status?: ApplicationStatus;
      notes?: string | null;
    };

    if (!body.profileText?.trim() || !body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Resume text and job description are required." },
        { status: 400 }
      );
    }

    if (!body.fitAnalysis || !body.documents) {
      return NextResponse.json(
        { error: "Generate the application package before saving." },
        { status: 400 }
      );
    }

    if (!body.parsedJob) {
      return NextResponse.json(
        { error: "Parsed job data is required when saving an application." },
        { status: 400 }
      );
    }

    const parseStartedAt = Date.now();
    const parsedResume = await parseProfileText(body.profileText);
    console.log("application-save-parse-ms", Date.now() - parseStartedAt);
    const saveStartedAt = Date.now();
    const savedApplication = await saveGeneratedApplication({
      userId: null,
      resumeFileName: body.uploadedFileName ?? null,
      rawResumeText: body.profileText,
      rawJobText: body.jobDescription,
      parsedResume,
      parsedJob: body.parsedJob,
      fitAnalysis: body.fitAnalysis,
      coverLetterDraft: body.documents.coverLetter,
      emailDraft: body.documents.applicationEmail,
      status: body.status ?? "draft",
      notes: body.notes ?? null
    });
    console.log("application-save-db-ms", Date.now() - saveStartedAt);
    console.log("application-save-total-ms", Date.now() - startedAt);

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
