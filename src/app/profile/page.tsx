// This file repurposes the old profile route so it fits the current MVP.
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { MetadataPanel } from "@/components/ui/MetadataPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonStyles } from "@/components/ui/buttonStyles";

export default function ProfilePage() {
  return (
    <AppShell contentClassName="max-w-3xl">
      <PageHeader
        eyebrow="Account"
        title="Account"
        description="The current MVP keeps resume upload and generation in the workspace. This route remains a lightweight placeholder for future account settings."
      />
      <MetadataPanel title="Coming soon" description="Your default workflow is still the main workspace." className="mt-6">
        <p className="text-sm leading-6 text-[var(--color-muted)]">
          Resume input and upload now happen directly on the main workspace so users
          can generate application packages faster.
        </p>
        <Link
          href="/"
          className={`${buttonStyles({ variant: "secondary", size: "sm" })} mt-4`}
        >
          Go to workspace
        </Link>
      </MetadataPanel>
    </AppShell>
  );
}
