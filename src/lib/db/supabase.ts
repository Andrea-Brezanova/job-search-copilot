// This file creates reusable Supabase clients for browser and server usage.
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isConfiguredValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  // The checked-in env file uses placeholder strings. Treating those as valid
  // creates confusing runtime failures later, so we fail fast here instead.
  return !value.includes("your-project") && !value.includes("your-") && !value.includes("placeholder");
}

export function getSupabaseBrowserClient() {
  if (!isConfiguredValue(supabaseUrl) || !isConfiguredValue(supabaseAnonKey)) {
    return null;
  }

  return createClient(supabaseUrl as string, supabaseAnonKey as string);
}

export async function getSupabaseBrowserAccessToken() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return "";
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? "";
}

export function getSupabaseServerClient() {
  if (!isConfiguredValue(supabaseUrl) || !isConfiguredValue(supabaseServiceRoleKey)) {
    return null;
  }

  return createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function getAuthenticatedSupabaseUser(request: Request): Promise<User | null> {
  if (!isConfiguredValue(supabaseUrl) || !isConfiguredValue(supabaseAnonKey)) {
    return null;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = bearerMatch?.[1]?.trim();

  if (!accessToken) {
    return null;
  }

  const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error) {
    return null;
  }

  return data.user ?? null;
}
