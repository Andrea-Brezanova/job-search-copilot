import { useEffect, useState } from "react";

type UseDefaultResumeOptions = {
  userId: string | null;
  accessToken: string;
  currentProfileText: string;
  setProfileText: (value: string) => void;
};

export function useDefaultResume({
  userId,
  accessToken,
  currentProfileText,
  setProfileText,
}: UseDefaultResumeOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUsingSavedResume, setIsUsingSavedResume] = useState(false);
  const [hasDefaultResume, setHasDefaultResume] = useState(false);
  const [loadedDefaultResumeForUserId, setLoadedDefaultResumeForUserId] =
    useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDefault() {
      if (!userId || !accessToken) {
        if (isActive) {
          setLoadedDefaultResumeForUserId(null);
          setIsUsingSavedResume(false);
          setIsLoading(false);
          setError("");
          setMessage("");
          setHasDefaultResume(false);
        }
        return;
      }

      if (loadedDefaultResumeForUserId === userId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/resume-default", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = (await response.json()) as {
          error?: string;
          resume?: { raw_resume_text?: string | null } | null;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load the saved resume.");
        }

        const savedResumeText = data.resume?.raw_resume_text?.trim() ?? "";

        if (savedResumeText && !currentProfileText.trim() && isActive) {
          setProfileText(savedResumeText);
          setIsUsingSavedResume(true);
          setMessage("Using saved resume.");
        }

        if (isActive) {
          setHasDefaultResume(Boolean(savedResumeText));
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the saved resume.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          setLoadedDefaultResumeForUserId(userId);
        }
      }
    }

    void loadDefault();

    return () => {
      isActive = false;
    };
  }, [
    accessToken,
    currentProfileText,
    loadedDefaultResumeForUserId,
    setProfileText,
    userId,
  ]);

  async function saveDefault(profileText: string, uploadedFileName?: string | null) {
    setError("");
    setMessage("");

    if (!profileText.trim()) {
      setError("Please add your resume / CV before saving it.");
      return;
    }

    if (!accessToken) {
      setError("Please log in to save your default resume.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/resume-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          profileText,
          uploadedFileName: uploadedFileName || null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save the default resume.");
      }

      setIsUsingSavedResume(true);
      setHasDefaultResume(true);
      setMessage("Saved as your default resume.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the default resume.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function clearUsageState() {
    setIsUsingSavedResume(false);
    setMessage("");
  }

  return {
    isLoading,
    isSaving,
    defaultResumeMessage: message,
    defaultResumeError: error,
    isUsingSavedResume,
    hasDefaultResume,
    saveDefault,
    clearUsageState,
  };
}
