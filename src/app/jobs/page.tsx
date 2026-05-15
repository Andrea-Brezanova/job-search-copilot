// This file repurposes the old jobs route so it points users toward the new MVP flow.
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { MetadataPanel } from "@/components/ui/MetadataPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonStyles } from "@/components/ui/buttonStyles";

export default function JobsPage() {
  return (
    <AppShell contentClassName="max-w-3xl">
      <PageHeader
        eyebrow="Jobs"
        title="Jobs"
        description="This route remains a placeholder while the current product centers on the workspace and tracked applications."
      />
      <MetadataPanel title="Current flow" description="Generate and save application packages from the main workspace." className="mt-6">
        <p className="text-sm leading-6 text-[var(--color-muted)]">
          The MVP now centers on generating and saving application packages from the
          main workspace.
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
