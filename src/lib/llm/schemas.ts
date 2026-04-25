// This file documents the expected response shapes for future model calls.
export const generatedApplicationContentJsonSchema = {
  name: "generated_application_content",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      cover_letter: {
        type: "string",
        description: "A tailored, truthful cover letter."
      },
      email_text: {
        type: "string",
        description: "A short, professional application email."
      },
      application_summary: {
        type: "string",
        description: "A short summary of why the candidate is a credible fit."
      }
    },
    required: ["cover_letter", "email_text", "application_summary"]
  }
} as const;

export const fitAnalysisSchemaDescription = {
  fitScore: "number from 0 to 100",
  strengths: "string[]",
  gaps: "string[]",
  recommendation: '"Apply" | "Maybe" | "Skip"',
  reasoning: "short string"
};

export const applicationDocsSchemaDescription = {
  coverLetter: "string",
  applicationEmail: "string"
};

export const parsedProfileSchemaDescription = {
  summary: "string",
  skills: "string[]",
  experienceLevel: "string",
  targetRoles: "string[]"
};
