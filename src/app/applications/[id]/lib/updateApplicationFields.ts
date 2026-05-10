import type { ApplicationRecord, UpdateApplicationInput } from "@/lib/types";

export async function updateApplicationFields(
  applicationId: string,
  accessToken: string,
  input: UpdateApplicationInput
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
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to save application changes.");
  }

  return data as ApplicationRecord;
}
