// This file exposes the job-fit analysis endpoint used by the homepage.
import { NextResponse } from "next/server";
import { analyzeJobFit } from "@/lib/engines/matchEngine";

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

    const result = await analyzeJobFit(body.profileText, body.jobDescription);
    return NextResponse.json(result);
  } catch (error) {
    console.error("analyze-job error", error);

    return NextResponse.json(
      { error: "Unable to analyze the job fit." },
      { status: 500 }
    );
  }
}
