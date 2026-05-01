"use client";

import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";

export function AppHeader() {
  const { user } = useAuth();

  return (
    <div className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
            AI Job Copilot
          </Link>
          {user ? (
            <nav className="hidden items-center gap-4 text-sm text-stone-600 md:flex">
              <Link href="/" className="hover:text-stone-900">
                Workspace
              </Link>
              <Link href="/applications" className="hover:text-stone-900">
                Applications
              </Link>
            </nav>
          ) : null}
        </div>
        {user ? <AuthPanel /> : null}
      </div>
    </div>
  );
}
