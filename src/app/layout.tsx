// This file defines the shared HTML shell for the entire app.
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Job Copilot",
  description:
    "Generate tailored application cover letter and email. Track your job search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-end px-6 py-4">
            <nav className="flex items-center gap-4 text-sm text-stone-600">
              <Link href="/" className="hover:text-stone-900">
                Workspace
              </Link>
              <Link href="/applications" className="hover:text-stone-900">
                Applications
              </Link>
            </nav>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
