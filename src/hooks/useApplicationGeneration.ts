import { useEffect, useState } from "react";
import type {
  ApplicationDocs as ApplicationDocsType,
  ApplicationPackage,
  ApplicationStatus,
} from "@/lib/types";

const generationStages = [
  "Reading your resume...",
  "Reading the job description...",
  "Extracting key skills and responsibilities...",
  "Matching your background to the role...",
  "Drafting your cover letter and email...",
  "Still drafting your application package..."
];

export function useApplicationGeneration() {
  const [applicationPackage, setApplicationPackage] =
    useState<ApplicationPackage | null>(null);
  const [status] = useState<ApplicationStatus>("draft");
  const [notes, setNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStageIndex, setGenerationStageIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setGenerationStageIndex((currentIndex) =>
        Math.min(currentIndex + 1, generationStages.length - 1)
      );
    }, 1600);

    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  function resetGeneratedPackage() {
    setApplicationPackage(null);
  }

  function clearStatusMessage() {
    setStatusMessage("");
  }

  function handleNotesChange(value: string) {
    setNotes(value);
  }

  function handleDocumentsChange(
    field: keyof ApplicationDocsType,
    value: string,
  ) {
    setApplicationPackage((currentPackage) => {
      if (!currentPackage) {
        return currentPackage;
      }

      return {
        ...currentPackage,
        documents: {
          ...currentPackage.documents,
          [field]: value,
        },
      };
    });
  }

  async function handleGenerateClick(
    profileText: string,
    jobDescription: string,
    onGenerated?: () => void,
  ) {
    setStatusMessage("");
    setIsGenerating(true);
    setGenerationStageIndex(0);

    try {
      const response = await fetch("/api/generate-application-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileText, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "We could not generate the application package. Please try again.",
        );
      }

      setApplicationPackage(data as ApplicationPackage);
      onGenerated?.();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsGenerating(false);
      setGenerationStageIndex(0);
    }
  }

  return {
    applicationPackage,
    status,
    notes,
    statusMessage,
    isGenerating,
    generationStageIndex,
    generationStages,
    handleGenerateClick,
    handleNotesChange,
    handleDocumentsChange,
    clearStatusMessage,
    resetGeneratedPackage,
    setStatusMessage,
  };
}
