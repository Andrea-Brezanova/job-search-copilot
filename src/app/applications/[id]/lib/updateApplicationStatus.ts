import type { ApplicationRecord, ApplicationUpdateAction } from "@/lib/types";

export async function updateApplicationStatus(
  applicationId: string,
  accessToken: string,
  action: ApplicationUpdateAction
): Promise<ApplicationRecord> {
  if (!accessToken) {
    throw new Error("Please log in to update this application.");
  }

  const response = await fetch(`/api/applications/${applicationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to update application.");
  }

  return data as ApplicationRecord;
}
