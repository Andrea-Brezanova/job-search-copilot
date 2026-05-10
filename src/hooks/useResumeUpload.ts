import { useState } from "react";

type UseResumeUploadOptions = {
  onResumeChanged?: () => void;
};

export function useResumeUpload({ onResumeChanged }: UseResumeUploadOptions = {}) {
  const [profileText, setProfileText] = useState("");
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function setProfileTextDirectly(value: string) {
    setProfileText(value);
  }

  function handleProfileTextChange(value: string) {
    setProfileText(value);
    onResumeChanged?.();
  }

  async function handleFileUpload(file: File | null) {
    setUploadError("");
    setUploadNote("");
    setUploadSuccess("");
    setUploadedResumeFile(null);
    setUploadedFileName("");

    if (!file) {
      handleProfileTextChange("");
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!extension || !["txt", "pdf", "doc", "docx"].includes(extension)) {
        throw new Error("Please upload a .txt, .pdf, .doc, or .docx file.");
      }

      setUploadedResumeFile(file);

      if (extension === "txt") {
        const textContent = await file.text();
        handleProfileTextChange(textContent);
        setUploadSuccess(
          "Text file loaded successfully. Resume text added to the form.",
        );
        return;
      }

      if (extension === "pdf") {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          extractedText?: string;
          message?: string;
          error?: string;
        };

        if (!response.ok || !data.extractedText) {
          throw new Error(data.error ?? "Unable to parse the uploaded PDF.");
        }

        handleProfileTextChange(data.extractedText);
        setUploadSuccess(
          data.message ??
            "PDF parsed successfully. Resume text added to the form.",
        );
        return;
      }

      setUploadNote("File uploaded. PDF/DOCX parsing is the next step.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to process the uploaded file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return {
    profileText,
    setProfileTextDirectly,
    uploadedResumeFile,
    uploadedFileName,
    uploadNote,
    uploadError,
    uploadSuccess,
    isUploading,
    handleFileUpload,
    handleProfileTextChange,
  };
}
