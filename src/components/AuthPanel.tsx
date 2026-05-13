"use client";

import { useState } from "react";
import {
  getSupabaseBrowserClient,
  getSupabaseRememberMePreference,
  setSupabaseRememberMePreference,
} from "@/lib/db/supabase";
import { useAuth } from "@/components/AuthProvider";

type AuthPanelProps = {
  variant?: "header" | "card";
};

function getSignUpRedirectUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    return undefined;
  }

  return configuredSiteUrl.replace(/\/+$/g, "");
}

function formatAuthErrorMessage(error: unknown, mode: "sign_in" | "sign_up") {
  const fallback = "We could not complete authentication. Please try again.";

  if (!(error instanceof Error)) {
    return fallback;
  }

  const normalizedMessage = error.message.toLowerCase();

  if (mode === "sign_up") {
    if (
      normalizedMessage.includes("password") ||
      normalizedMessage.includes("weak password") ||
      normalizedMessage.includes("at least")
    ) {
      return "Use a password with at least 6 characters.";
    }
  }

  return error.message || fallback;
}

export function AuthPanel({ variant = "header" }: AuthPanelProps) {
  const { isConfigured, isLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() =>
    getSupabaseRememberMePreference(),
  );
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    setMessage("");
    setErrorMessage("");

    setSupabaseRememberMePreference(mode === "sign_in" ? rememberMe : true);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setErrorMessage("Supabase auth is not configured yet.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sign_up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getSignUpRedirectUrl(),
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setMessage("Account created and you are now signed in.");
        } else {
          setMessage(
            "Account created. Check your email if confirmation is required before signing in.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage("Signed in successfully.");
      }

      setPassword("");
    } catch (error) {
      setErrorMessage(formatAuthErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setMessage("");
    setErrorMessage("");

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setErrorMessage("Supabase auth is not configured yet.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setEmail("");
      setPassword("");
      setRememberMe(true);
      setMode("sign_in");
      setMessage("Signed out.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not sign you out. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isConfigured) {
    return (
      <p className={variant === "card" ? "text-sm text-stone-500" : "text-xs text-stone-500"}>
        Supabase auth is not configured in this environment.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className={variant === "card" ? "text-sm text-stone-500" : "text-xs text-stone-500"}>
        Checking session...
      </p>
    );
  }

  if (user) {
    return (
      <div
        className={
          variant === "card"
            ? "flex flex-col gap-3"
            : "flex flex-col items-end gap-2"
        }
      >
        <p className="text-sm text-stone-600">
          Signed in as <span className="font-medium text-stone-900">{user.email}</span>
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSubmitting}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing out..." : "Sign out"}
        </button>
        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="text-xs text-rose-700">{errorMessage}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={
        variant === "card"
          ? "flex w-full max-w-sm flex-col gap-3"
          : "flex max-w-sm flex-col items-end gap-2"
      }
    >
      <div
        className={
          variant === "card"
            ? "flex gap-3 text-sm font-medium text-stone-600"
            : "flex gap-2 text-xs font-medium text-stone-600"
        }
      >
        <button
          type="button"
          onClick={() => setMode("sign_in")}
          className={mode === "sign_in" ? "text-stone-900 underline underline-offset-4" : ""}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign_up")}
          className={mode === "sign_up" ? "text-stone-900 underline underline-offset-4" : ""}
        >
          Sign up
        </button>
      </div>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {mode === "sign_up" ? (
        <p className="text-xs text-stone-500">
          Use at least 6 characters.
        </p>
      ) : null}
      {mode === "sign_in" ? (
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-200"
          />
          Remember me
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isSubmitting || !email.trim() || password.length < 6}
        className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {isSubmitting
          ? mode === "sign_up"
            ? "Creating account..."
            : "Signing in..."
          : mode === "sign_up"
            ? "Create account"
            : "Sign in"}
      </button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="text-xs text-rose-700">{errorMessage}</p> : null}
    </div>
  );
}
