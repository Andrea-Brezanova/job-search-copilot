// This file documents the expected response shapes for future model calls.
export const generatedApplicationContentJsonSchema = {
  name: "generated_application_content",
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
      },
      applicationSummary: {
        type: "string",
        description: "A short summary of why the candidate is a credible fit."
      },
      qualityNotes: {
        type: "object",
        additionalProperties: false,
        properties: {
          factsUsedFromResume: {
            type: "array",
            items: { type: "string" }
          },
          jobRequirementsAddressed: {
            type: "array",
            items: { type: "string" }
          },
          growthAreasPhrasedCarefully: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: [
          "factsUsedFromResume",
          "jobRequirementsAddressed",
          "growthAreasPhrasedCarefully"
        ]
      }
    },
    required: [
      "coverLetter",
      "applicationEmail",
      "applicationSummary",
      "qualityNotes"
    ]
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
