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
  if (!input.userId) {
    throw new Error("saveGeneratedApplication requires a userId.");
  }

  const supabase = getDatabaseClient();

  // Resumes are saved first so applications can point at a stable source record.
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .insert({
      user_id: input.userId,
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
      user_id: input.userId,
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
      follow_up_email_draft: null,
      status: input.status ?? "draft",
      notes: input.notes ?? null
    })
    .select("*")
    .single();

  if (applicationError) {
    throw new Error(`Failed to insert application: ${applicationError.message}`);
  }

  return application as ApplicationRecord;
}

export async function saveDefaultResume(
  userId: string,
  rawResumeText: string,
  fileName?: string | null
): Promise<ResumeRecord> {
  if (!userId) {
    throw new Error("saveDefaultResume requires a userId.");
  }

  if (!rawResumeText.trim()) {
    throw new Error("saveDefaultResume requires resume text.");
  }

  const supabase = getDatabaseClient();

  const { error: clearDefaultsError } = await supabase
    .from("resumes")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (clearDefaultsError) {
    throw new Error(`Failed to clear default resumes: ${clearDefaultsError.message}`);
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      file_name: fileName ?? null,
      raw_resume_text: rawResumeText.trim(),
      parsed_resume_json: null,
      is_default: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save default resume: ${error.message}`);
  }

  return data as ResumeRecord;
}

export async function getDefaultResume(
  userId: string
): Promise<ResumeRecord | null> {
  if (!userId) {
    throw new Error("getDefaultResume requires a userId.");
  }

  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch default resume: ${error.message}`);
  }

  return (data as ResumeRecord | null) ?? null;
}

export async function listApplications(
  userId: string
): Promise<ApplicationRecord[]> {
  if (!userId) {
    throw new Error("listApplications requires a userId.");
  }

  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list applications: ${error.message}`);
  }

  return (data ?? []) as ApplicationRecord[];
}

export async function getApplicationById(
  id: string,
  userId: string
): Promise<ApplicationRecord | null> {
  if (!userId) {
    throw new Error("getApplicationById requires a userId.");
  }

  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch application ${id}: ${error.message}`);
  }

  return (data as ApplicationRecord | null) ?? null;
}

export async function updateApplicationById(
  id: string,
  userId: string,
  input: UpdateApplicationInput
): Promise<ApplicationRecord> {
  if (!userId) {
    throw new Error("updateApplicationById requires a userId.");
  }

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

  if (input.followUpEmailDraft !== undefined) {
    updatePayload.follow_up_email_draft = input.followUpEmailDraft;
  }

  if (input.status !== undefined) {
    updatePayload.status = input.status;
  }

  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  if (input.appliedAt !== undefined) {
    updatePayload.applied_at = input.appliedAt;
  }

  if (input.followUpAt !== undefined) {
    updatePayload.follow_up_at = input.followUpAt;
  }

  if (input.archivedAt !== undefined) {
    updatePayload.archived_at = input.archivedAt;
  }

  const { data, error } = await supabase
    .from("applications")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update application ${id}: ${error.message}`);
  }

  return data as ApplicationRecord;
}
