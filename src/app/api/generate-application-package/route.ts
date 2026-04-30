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
        { error: "Please add your resume / CV and the job description." },
        { status: 400 }
      );
    }

    console.log("API RECEIVED resumeText:", body.profileText.slice(0, 200));
    console.log(
      "API RECEIVED jobDescriptionText:",
      body.jobDescription.slice(0, 200)
    );

    const applicationPackage = await generateApplicationPackage(
      body.profileText,
      body.jobDescription
    );

    return NextResponse.json(applicationPackage);
  } catch (error) {
    console.error("generate-application-package error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? toUserFacingGenerationError(error.message)
            : "We could not generate the application package. Please try again."
      },
      { status: 500 }
    );
  }
}

function toUserFacingGenerationError(message: string) {
  if (/valid role from the job description/i.test(message)) {
    return "We could not clearly detect the job title. Please check the job description and try again.";
  }

  if (/valid candidate name from the resume header/i.test(message)) {
    return "We could not clearly detect your name from the resume / CV. Please check the uploaded file and try again.";
  }

  if (/resume evidence/i.test(message)) {
    return "We could not find enough clear experience in the resume / CV to generate an application package. Please review the file and try again.";
  }

  if (/resume-supported skills/i.test(message)) {
    return "We could not clearly identify relevant skills from the resume / CV. Please review the file and try again.";
  }

  return "We could not generate the application package. Please try again.";
}
