// This file creates reusable Supabase clients for browser and server usage.
import { createClient } from "@supabase/supabase-js";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authStoragePreferenceKey = "ai-job-copilot-auth-storage";
let browserClient: SupabaseClient | null | undefined;

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

  if (!browserClient) {
    browserClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: createSupabaseBrowserStorage(),
      },
    });
  }

  return browserClient;
}

export function getSupabaseRememberMePreference() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(authStoragePreferenceKey) !== "session";
}

export function setSupabaseRememberMePreference(rememberMe: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    authStoragePreferenceKey,
    rememberMe ? "local" : "session",
  );
}

export function isSupabaseBrowserAuthConfigured() {
  return Boolean(getSupabaseBrowserClient());
}

export async function getSupabaseBrowserSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function getSupabaseBrowserAccessToken() {
  const session = await getSupabaseBrowserSession();
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

function createSupabaseBrowserStorage() {
  return {
    getItem(key: string) {
      if (typeof window === "undefined") {
        return null;
      }

      const selectedStorage = getSupabaseRememberMePreference()
        ? window.localStorage
        : window.sessionStorage;

      return selectedStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (typeof window === "undefined") {
        return;
      }

      const useLocalStorage = getSupabaseRememberMePreference();
      const activeStorage = useLocalStorage
        ? window.localStorage
        : window.sessionStorage;
      const inactiveStorage = useLocalStorage
        ? window.sessionStorage
        : window.localStorage;

      activeStorage.setItem(key, value);
      inactiveStorage.removeItem(key);
    },
    removeItem(key: string) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
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
