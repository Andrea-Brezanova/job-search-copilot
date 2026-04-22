// This file contains the Supabase queries for resumes and applications.
import { getSupabaseServerClient } from "@/lib/db/supabase";
import type {
  ApplicationRecord,
  CreateApplicationInput,
  ResumeRecord,
  UpdateApplicationInput
} from "@/lib/types";

function getDatabaseClient() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error(
      "Supabase server client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return supabase;
}

export async function saveGeneratedApplication(
  input: CreateApplicationInput
): Promise<ApplicationRecord> {
  const supabase = getDatabaseClient();

  // Resumes are saved first so applications can point at a stable source record.
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .insert({
      user_id: input.userId ?? null,
      file_name: input.resumeFileName ?? null,
      raw_resume_text: input.rawResumeText,
      parsed_resume_json: input.parsedResume,
      is_default: false
    })
    .select("*")
    .single();

  if (resumeError) {
    throw new Error(`Failed to insert resume: ${resumeError.message}`);
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      user_id: input.userId ?? null,
      resume_id: resume.id,
      job_source_type: "manual_text",
      job_url: null,
      raw_job_text: input.rawJobText,
      parsed_job_json: input.parsedJob,
      company_name: input.parsedJob.company ?? null,
      role_title: input.parsedJob.title,
      location_text: input.parsedJob.locationText ?? null,
      fit_summary: input.fitAnalysis.reasoning,
      fit_score: input.fitAnalysis.fitScore,
      cover_letter_draft: input.coverLetterDraft,
      email_draft: input.emailDraft,
      status: input.status,
      notes: input.notes ?? null
    })
    .select("*")
    .single();

  if (applicationError) {
    throw new Error(`Failed to insert application: ${applicationError.message}`);
  }

  return application as ApplicationRecord;
}

export async function listApplications(): Promise<ApplicationRecord[]> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list applications: ${error.message}`);
  }

  return (data ?? []) as ApplicationRecord[];
}

export async function getApplicationById(
  id: string
): Promise<ApplicationRecord | null> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch application ${id}: ${error.message}`);
  }

  return (data as ApplicationRecord | null) ?? null;
}

export async function updateApplicationById(
  id: string,
  input: UpdateApplicationInput
): Promise<ApplicationRecord> {
  const supabase = getDatabaseClient();
  const updatePayload: Record<string, string | null> = {
    updated_at: new Date().toISOString()
  };

  if (input.coverLetterDraft !== undefined) {
    updatePayload.cover_letter_draft = input.coverLetterDraft;
  }

  if (input.emailDraft !== undefined) {
    updatePayload.email_draft = input.emailDraft;
  }

  if (input.status !== undefined) {
    updatePayload.status = input.status;
  }

  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  const { data, error } = await supabase
    .from("applications")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update application ${id}: ${error.message}`);
  }

  return data as ApplicationRecord;
}
