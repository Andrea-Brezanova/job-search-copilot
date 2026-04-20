// This file exposes the document generation endpoint for application drafts.
import { NextResponse } from "next/server";
import { generateApplicationDocs } from "@/lib/engines/applicationEngine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profileText?: string;
      jobDescription?: string;
    };

    if (!body.profileText?.trim() || !body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Profile text and job description are required." },
        { status: 400 }
      );
    }

    const documents = await generateApplicationDocs(
      body.profileText,
      body.jobDescription
    );

    return NextResponse.json(documents);
  } catch (error) {
    console.error("generate-application error", error);

    return NextResponse.json(
      { error: "Unable to generate application documents." },
      { status: 500 }
    );
  }
}
