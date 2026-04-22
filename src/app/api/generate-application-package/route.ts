// This file generates the full application package for the workspace.
import { NextResponse } from "next/server";
import { generateApplicationPackage } from "@/lib/engines/applicationEngine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profileText?: string;
      jobDescription?: string;
    };

    if (!body.profileText?.trim() || !body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Resume text and job description are required." },
        { status: 400 }
      );
    }

    const applicationPackage = await generateApplicationPackage(
      body.profileText,
      body.jobDescription
    );

    return NextResponse.json(applicationPackage);
  } catch (error) {
    console.error("generate-application-package error", error);

    return NextResponse.json(
      { error: "Unable to generate the application package." },
      { status: 500 }
    );
  }
}
