"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApplicationDocs } from "@/components/ApplicationDocs";
import { ApplicationSavePanel } from "@/components/ApplicationSavePanel";
import { useAuth } from "@/components/AuthProvider";
import { ApplicationContactInfo } from "./components/ApplicationContactInfo";
import { ApplicationOverview } from "./components/ApplicationOverview";
import { ApplicationStatusActions } from "./components/ApplicationStatusActions";
import { FollowUpEmailSection } from "./components/FollowUpEmailSection";
import { generateFollowUpEmail } from "./lib/generateFollowUpEmail";
import { updateApplicationFields } from "./lib/updateApplicationFields";
import { updateApplicationStatus } from "./lib/updateApplicationStatus";
import type {
  ApplicationDocs as ApplicationDocsType,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationUpdateAction,
} from "@/lib/types";

type ApplicationDetailClientProps = {
  applicationId: string;
};

export function ApplicationDetailClient({
  applicationId,
}: ApplicationDetailClientProps) {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocsType | null>(null);
  const [followUpEmailDraft, setFollowUpEmailDraft] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("draft");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionUpdating, setIsActionUpdating] = useState(false);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);

  useEffect(() => {
    async function loadApplication() {
      setIsPageLoading(true);
      setErrorMessage("");

      if (isAuthLoading) {
        return;
      }

      try {
        const accessToken = session?.access_token ?? "";

        if (!accessToken) {
          throw new Error("Please log in to view this application.");
        }

        const response = await fetch(`/api/applications/${applicationId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load application.");
        }

        applyApplicationRecord(data as ApplicationRecord);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred."
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    if (applicationId && !isAuthLoading) {
      void loadApplication();
    }
  }, [applicationId, isAuthLoading, session]);

  function applyApplicationRecord(record: ApplicationRecord) {
    setApplication(record);
    setDocuments({
      coverLetter: record.cover_letter_draft,
      applicationEmail: record.email_draft,
    });
    setFollowUpEmailDraft(record.follow_up_email_draft ?? "");
    setContactName(record.contact_name ?? "");
    setContactEmail(record.contact_email ?? "");
    setJobUrl(record.job_url ?? "");
    setStatus(record.status);
    setNotes(record.notes ?? "");
  }

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
        [field]: value,
      };
    });
  }

  async function runApplicationAction(action: ApplicationUpdateAction) {
    setErrorMessage("");
    setSaveMessage("");
    setFollowUpMessage("");
    setIsActionUpdating(true);

    try {
      const accessToken = session?.access_token ?? "";
      const updatedRecord = await updateApplicationStatus(
        applicationId,
        accessToken,
        action
      );
      applyApplicationRecord(updatedRecord);
      setSaveMessage(buildActionSuccessMessage(action));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsActionUpdating(false);
    }
  }

  async function saveApplication() {
    if (!documents) {
      return;
    }

    setErrorMessage("");
    setSaveMessage("");
    setFollowUpMessage("");
    setIsSaving(true);

    try {
      const accessToken = session?.access_token ?? "";
      const updatedRecord = await updateApplicationFields(applicationId, accessToken, {
        coverLetterDraft: documents.coverLetter,
        emailDraft: documents.applicationEmail,
        followUpEmailDraft: followUpEmailDraft.trim() || null,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        jobUrl: jobUrl.trim() || null,
        notes,
      });
      applyApplicationRecord(updatedRecord);
      setSaveMessage("Changes saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateFollowUp() {
    setErrorMessage("");
    setSaveMessage("");
    setFollowUpMessage("");
    setIsGeneratingFollowUp(true);

    try {
      const accessToken = session?.access_token ?? "";
      const updatedRecord = await generateFollowUpEmail(applicationId, accessToken);
      applyApplicationRecord(updatedRecord);
      setFollowUpMessage("Follow-up email generated. You can edit it before saving.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    } finally {
      setIsGeneratingFollowUp(false);
    }
  }

  async function copyFollowUpEmail() {
    try {
      await navigator.clipboard.writeText(followUpEmailDraft);
      setFollowUpMessage("Follow-up email copied.");
      window.setTimeout(() => setFollowUpMessage(""), 2000);
    } catch {
      setFollowUpMessage("Unable to copy the follow-up email.");
      window.setTimeout(() => setFollowUpMessage(""), 2000);
    }
  }

  function openFollowUpInGmail() {
    if (!application) {
      return;
    }

    const gmailUrl = buildGmailComposeUrl(
      contactEmail,
      buildFollowUpEmailSubject(application.role_title),
      followUpEmailDraft
    );
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  }

  const isLoading = isAuthLoading || !applicationId || isPageLoading;
  const isLoggedOut = !isAuthLoading && !session;

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
        {isLoggedOut ? (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
            <p className="text-sm text-stone-600">
              Sign in to view saved application details.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              Go to workspace
            </Link>
          </section>
        ) : (
          <p className="text-sm text-stone-600">Application not found.</p>
        )}
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

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6">
        <ApplicationOverview application={application} jobUrl={jobUrl} />

        <ApplicationStatusActions
          currentStatus={status}
          onAction={runApplicationAction}
          isUpdating={isActionUpdating}
        />

        <ApplicationDocs
          documents={documents}
          exportFileBaseName={[application.role_title, application.company_name]
            .filter(Boolean)
            .join(" ")}
          applicationEmailGmailTo={contactEmail}
          applicationEmailGmailSubject={buildApplicationEmailSubject(
            application.role_title,
            application.company_name
          )}
          onChange={handleDocumentsChange}
        />

        <ApplicationContactInfo
          contactName={contactName}
          contactEmail={contactEmail}
          jobUrl={jobUrl}
          onContactNameChange={setContactName}
          onContactEmailChange={setContactEmail}
          onJobUrlChange={setJobUrl}
        />

        <FollowUpEmailSection
          application={application}
          draft={followUpEmailDraft}
          message={followUpMessage}
          isGenerating={isGeneratingFollowUp}
          onDraftChange={setFollowUpEmailDraft}
          onGenerate={() => void handleGenerateFollowUp()}
          onCopy={() => void copyFollowUpEmail()}
          onOpenInGmail={openFollowUpInGmail}
        />

        <ApplicationSavePanel
          status={status}
          notes={notes}
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

function buildActionSuccessMessage(action: ApplicationUpdateAction) {
  switch (action) {
    case "mark_applied":
      return "Application marked as applied.";
    case "set_follow_up":
      return "Follow-up date set.";
    case "move_to_interview":
      return "Application moved to interview.";
    case "mark_rejected":
      return "Application marked as rejected.";
    case "archive":
      return "Application archived.";
    default:
      return "Application updated.";
  }
}

function buildApplicationEmailSubject(role: string, company?: string | null) {
  const normalizedRole = role.trim() || "this role";
  const normalizedCompany = company?.trim();

  return normalizedCompany
    ? `Application for ${normalizedRole} at ${normalizedCompany}`
    : `Application for ${normalizedRole}`;
}

function buildFollowUpEmailSubject(role: string) {
  return `Following up on my application for ${role.trim() || "this role"}`;
}

function buildGmailComposeUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    su: subject,
    body,
  });

  if (to.trim()) {
    params.set("to", to.trim());
  }

  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}
