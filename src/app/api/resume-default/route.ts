import { NextResponse } from "next/server";
import {
  getDefaultResume,
  saveDefaultResume,
} from "@/lib/db/queries";
import { getAuthenticatedSupabaseUser } from "@/lib/db/supabase";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to load your saved resume." },
        { status: 401 },
      );
    }

    const resume = await getDefaultResume(user.id);
    return NextResponse.json({ resume });
  } catch (error) {
    console.error("resume-default GET error", error);

    return NextResponse.json(
      {
        error: "Unable to load the saved resume.",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to save your default resume." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      profileText?: string;
      uploadedFileName?: string | null;
    };

    if (!body.profileText?.trim()) {
      return NextResponse.json(
        { error: "Please add your resume / CV before saving it." },
        { status: 400 },
      );
    }

    const resume = await saveDefaultResume(
      user.id,
      body.profileText,
      body.uploadedFileName ?? null,
    );

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    console.error("resume-default POST error", error);

    return NextResponse.json(
      {
        error: "Unable to save the default resume.",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
