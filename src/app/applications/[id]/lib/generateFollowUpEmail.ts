import type { ApplicationRecord } from "@/lib/types";

export async function generateFollowUpEmail(
  applicationId: string,
  accessToken: string
): Promise<ApplicationRecord> {
  if (!accessToken) {
    throw new Error("Please log in to generate a follow-up email.");
  }

  const response = await fetch(`/api/applications/${applicationId}/follow-up`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to generate a follow-up email.");
  }

  return data.application as ApplicationRecord;
}
