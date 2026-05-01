// This file defines the shared HTML shell for the entire app.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
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
        <AuthProvider>
          <AppHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
