import { NextResponse } from "next/server";
import { inspectGenerationInputs } from "@/lib/engines/applicationEngine/debug";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      profileText?: string;
      jobDescription?: string;
    };

    if (!body.profileText?.trim() || !body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Please add your resume / CV and the job description." },
        { status: 400 }
      );
    }

    const snapshot = await inspectGenerationInputs(
      body.profileText,
      body.jobDescription
    );

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("generation-inputs debug error", error);
    return NextResponse.json(
      { error: "Could not inspect generation inputs." },
      { status: 500 }
    );
  }
}
