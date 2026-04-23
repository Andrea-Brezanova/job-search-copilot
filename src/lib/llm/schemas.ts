// This file documents the expected response shapes for future model calls.
export const applicationDocsJsonSchema = {
  name: "application_docs",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      coverLetter: {
        type: "string",
        description: "A tailored, truthful cover letter."
      },
      applicationEmail: {
        type: "string",
        description: "A short, professional application email."
      }
    },
    required: ["coverLetter", "applicationEmail"]
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
