// This file contains placeholder database helpers for a future persistence layer.
import type { ApplicationDocs, FitAnalysis } from "@/lib/types";
import { getSupabaseClient } from "@/lib/db/supabase";

export async function saveAnalysis(input: {
  profileText: string;
  jobDescription: string;
  fitAnalysis: FitAnalysis;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // TODO: Replace this with real persistence once Supabase env vars are configured.
    return { saved: false, reason: "Supabase client is not configured." };
  }

  void input;

  // TODO: Add a real insert when a table schema exists.
  return { saved: false, reason: "Persistence is not implemented yet." };
}

export async function saveApplicationDocs(input: {
  profileText: string;
  jobDescription: string;
  documents: ApplicationDocs;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // TODO: Replace this with real persistence once Supabase env vars are configured.
    return { saved: false, reason: "Supabase client is not configured." };
  }

  void input;

  // TODO: Add a real insert when a table schema exists.
  return { saved: false, reason: "Persistence is not implemented yet." };
}
