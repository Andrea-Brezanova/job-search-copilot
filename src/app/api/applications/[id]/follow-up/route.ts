import { NextResponse } from "next/server";
import { getApplicationById, updateApplicationById } from "@/lib/db/queries";
import { getAuthenticatedSupabaseUser } from "@/lib/db/supabase";
import { generateStructuredOutput } from "@/lib/llm/client";
import { GENERATE_FOLLOW_UP_EMAIL_PROMPT } from "@/lib/llm/prompts";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate a follow-up email." },
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

    const followUpContext = JSON.stringify(
      {
        roleTitle: application.role_title,
        companyName: application.company_name,
        rawJobText: application.raw_job_text,
        applicationEmailDraft: application.email_draft,
        coverLetterDraft: application.cover_letter_draft,
        appliedAt: application.applied_at,
        followUpAt: application.follow_up_at,
        status: application.status,
        notes: application.notes,
      },
      null,
      2
    );

    const generated = await generateStructuredOutput<string>({
      prompt: GENERATE_FOLLOW_UP_EMAIL_PROMPT,
      input: `followUpContext:\n${followUpContext}`,
      outputType: "text",
    });

    const followUpEmailDraft = generated.data?.trim();

    if (!followUpEmailDraft) {
      throw new Error(
        generated.error || "OpenAI did not return a usable follow-up email."
      );
    }

    const updatedApplication = await updateApplicationById(id, user.id, {
      followUpEmailDraft,
    });

    return NextResponse.json({
      application: updatedApplication,
      followUpEmailDraft,
      debug: {
        wasOpenAIUsed: generated.wasOpenAIUsed,
        model: generated.model,
      },
    });
  } catch (error) {
    console.error("follow-up email POST error", error);

    return NextResponse.json(
      {
        error: "Unable to generate the follow-up email.",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
