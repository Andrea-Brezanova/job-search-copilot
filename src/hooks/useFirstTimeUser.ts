import { useEffect, useState } from "react";

type UseFirstTimeUserOptions = {
  isLoggedIn: boolean;
  accessToken: string;
  userId: string | null;
};

export function useFirstTimeUser({
  isLoggedIn,
  accessToken,
  userId,
}: UseFirstTimeUserOptions) {
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [hasGeneratedFirstPackage, setHasGeneratedFirstPackage] = useState(false);
  const [hasSavedFirstApplication, setHasSavedFirstApplication] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadApplicationsCount() {
      if (!isLoggedIn || !accessToken || !userId) {
        if (isActive) {
          setApplicationsCount(0);
          setHasGeneratedFirstPackage(false);
          setHasSavedFirstApplication(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/applications", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = (await response.json()) as
          | { error?: string }
          | Array<{ id: string }>;

        if (!response.ok) {
          const errorMessage =
            !Array.isArray(data) && data.error
              ? data.error
              : "Unable to load saved applications.";
          throw new Error(errorMessage);
        }

        if (isActive) {
          setApplicationsCount(Array.isArray(data) ? data.length : 0);
          setHasGeneratedFirstPackage(false);
          setHasSavedFirstApplication(false);
        }
      } catch {
        if (isActive) {
          setApplicationsCount(0);
        }
      }
    }

    void loadApplicationsCount();

    return () => {
      isActive = false;
    };
  }, [accessToken, isLoggedIn, userId]);

  function markFirstGenerated() {
    setHasGeneratedFirstPackage(true);
  }

  function markFirstSaved(isFirstSaveForUser: boolean) {
    if (!isFirstSaveForUser) {
      return;
    }

    setApplicationsCount((currentCount) => Math.max(1, currentCount + 1));
    setHasSavedFirstApplication(true);
  }

  function resetFirstSaveState() {
    setHasSavedFirstApplication(false);
  }

  return {
    applicationsCount,
    hasGeneratedFirstPackage,
    hasSavedFirstApplication,
    shouldShowOnboarding: isLoggedIn && applicationsCount === 0,
    markFirstGenerated,
    markFirstSaved,
    resetFirstSaveState,
  };
}
