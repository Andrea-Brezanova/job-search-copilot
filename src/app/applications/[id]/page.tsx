"use client";

// This file shows one saved application and lets the user edit drafts, notes, and status.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApplicationDocs } from "@/components/ApplicationDocs";
import { ApplicationSavePanel } from "@/components/ApplicationSavePanel";
import type {
  ApplicationDocs as ApplicationDocsType,
  ApplicationRecord,
  ApplicationStatus
} from "@/lib/types";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocsType | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>("draft");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadApplication() {
      try {
        const response = await fetch(`/api/applications/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load application.");
        }

        const record = data as ApplicationRecord;
        setApplication(record);
        setDocuments({
          coverLetter: record.cover_letter_draft,
          applicationEmail: record.email_draft
        });
        setStatus(record.status);
        setNotes(record.notes ?? "");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      void loadApplication();
    }
  }, [params.id]);

  function handleDocumentsChange(
    field: keyof ApplicationDocsType,
    value: string
  ) {
    setDocuments((currentDocuments) => {
      if (!currentDocuments) {
        return currentDocuments;
      }

      return {
        ...currentDocuments,
        [field]: value
      };
    });
  }

  async function saveApplication() {
    if (!documents) {
      return;
    }

    setErrorMessage("");
    setSaveMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/applications/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coverLetterDraft: documents.coverLetter,
          emailDraft: documents.applicationEmail,
          status,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save application changes.");
      }

      const updatedRecord = data as ApplicationRecord;
      setApplication(updatedRecord);
      setSaveMessage("Changes saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
        <p className="text-sm text-stone-600">Loading application...</p>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
        <p className="text-sm text-stone-600">Application not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <Link
        href="/applications"
        className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
      >
        Back to applications
      </Link>

      <header className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">
          {application.role_title}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {application.company_name ?? "Company not parsed yet"}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Fit Score
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">
              {application.fit_score ?? "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Fit Summary
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {application.fit_summary ?? "No fit summary saved."}
            </p>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6">
        <ApplicationDocs documents={documents} onChange={handleDocumentsChange} />
        <ApplicationSavePanel
          status={status}
          notes={notes}
          onStatusChange={setStatus}
          onNotesChange={setNotes}
          onSave={saveApplication}
          isSaving={isSaving}
          isDisabled={!documents}
          message={saveMessage}
          savedApplicationId={application.id}
        />
      </section>
    </main>
  );
}
