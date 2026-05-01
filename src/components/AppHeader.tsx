"use client";

import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";

export function AppHeader() {
  return (
    <div className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <nav className="flex items-center gap-4 text-sm text-stone-600">
          <Link href="/" className="hover:text-stone-900">
            Workspace
          </Link>
          <Link href="/applications" className="hover:text-stone-900">
            Applications
          </Link>
        </nav>
        <AuthPanel />
      </div>
    </div>
  );
}
