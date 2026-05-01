"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/db/supabase";
import { useAuth } from "@/components/AuthProvider";

export function AuthPanel() {
  const { isConfigured, isLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    setMessage("");
    setErrorMessage("");

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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not complete authentication. Please try again.",
      );
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
      <p className="text-xs text-stone-500">
        Supabase auth is not configured in this environment.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-xs text-stone-500">Checking session...</p>;
  }

  if (user) {
    return (
      <div className="flex flex-col items-end gap-2">
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
    <div className="flex max-w-sm flex-col items-end gap-2">
      <div className="flex gap-2 text-xs font-medium text-stone-600">
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
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isSubmitting || !email.trim() || password.length < 6}
        className="w-full rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-stone-300"
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
