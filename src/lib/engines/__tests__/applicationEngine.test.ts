import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStructuredOutput } from "@/lib/llm/client";

vi.mock("@/lib/llm/client", () => ({
  generateStructuredOutput: vi.fn().mockResolvedValue({
    data: {
      cover_letter: `Dear Hiring Team,

I’m applying for the Junior Software Engineer role because it aligns with the kind of work I want to build on. During my recent internship, I built a backend project that improved workflows and gave me experience working with data and internal tools. Earlier experience also strengthened my communication and problem-solving skills.

Would you be available for a short Zoom call this week to discuss the role?

Best regards,
Andrea Brezanova
andrea.brezan@gmail.com`,
      email_text: `Hello Hiring Team,

I’m applying for the Junior Software Engineer role.

I’ve attached my cover letter and resume for your consideration.

Would you be available for a short Zoom call this week to discuss the role?

Best regards,
Andrea Brezanova
andrea.brezan@gmail.com`,
      application_summary:
        "The candidate has relevant project experience and a credible fit for the role."
    },
    model: "test-model",
    rawOutputText: "{\"cover_letter\":\"...\",\"email_text\":\"...\",\"application_summary\":\"...\"}",
    wasOpenAIUsed: true
  })
}));

import { generateApplicationPackage } from "@/lib/engines/applicationEngine";

const resumeText = `
Andrea Brezanova
andrea.brezan@gmail.com

Software Development Intern | German Archaeological Institute
Designed, developed, and deployed a Django-based web application to streamline procurement workflows.
Built the data model and application logic.
Integrated a relational database to reduce manual data entry and improve workflow efficiency.

QA Analyst | Wayfair
Used SQL to validate backend and frontend data.
Worked closely with product and engineering teams.
Investigated data issues across systems.
`;

const jobDescription = `
Junior Software Engineer
Show more options
Remote

Key Responsibilities:
- Build backend tools and internal services.
- Work with relational databases and APIs.
- Participate actively in code reviews.
`;

describe("generateApplicationPackage fallback generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves the exact parsed role in generated documents", async () => {
    const result = await generateApplicationPackage(resumeText, jobDescription);

    expect(result.documents.coverLetter).toContain("Junior Software Engineer role");
  });

  it("keeps direct-match positioning on direct-overlap roles", async () => {
    const result = await generateApplicationPackage(resumeText, jobDescription);

    expect(["strong_match", "partial_match"]).toContain(
      result.positioningStrategy?.generationMode
    );
    expect(["strong", "partial"]).toContain(result.positioningStrategy?.matchLevel);
  });

  it("never combines a person name with Hiring Team in the email greeting", async () => {
    const result = await generateApplicationPackage(resumeText, jobDescription);

    expect(result.documents.applicationEmail).toMatch(/^Dear Hiring Team,/);
    expect(result.documents.applicationEmail).not.toMatch(
      /^Dear [A-Z][a-z]+(?: [A-Z][a-z]+)? Hiring Team,/
    );
  });

  it("includes the email signature only once", async () => {
    const result = await generateApplicationPackage(resumeText, jobDescription);
    const email = result.documents.applicationEmail;

    expect(email.match(/Andrea Brezanova/g)?.length ?? 0).toBe(1);
    expect(email.match(/andrea\.brezan@gmail\.com/g)?.length ?? 0).toBe(1);
  });

  it("uses a neutral CTA without mentioning this week", async () => {
    const result = await generateApplicationPackage(resumeText, jobDescription);

    expect(result.documents.coverLetter).not.toContain("this week");
    expect(result.documents.applicationEmail).not.toContain("this week");
    expect(result.documents.applicationEmail).toContain(
      "Would you be available for a short Zoom call to discuss the role?"
    );
  });

  it("normalizes alternate this-week CTA variants", async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValueOnce({
      data: {
        cover_letter: `Dear Hiring Team,

I’m applying for the Junior Software Engineer role.

Would you be available for a short Zoom call this week to explore this role further?

Best regards,
Andrea Brezanova
andrea.brezan@gmail.com`,
        email_text: `Dear Hiring Team,

I’m applying for the Junior Software Engineer role.

Would you be available for a short Zoom call this week to explore this role further?

Best regards,
Andrea Brezanova
andrea.brezan@gmail.com`,
        application_summary: "Summary"
      },
      model: "test-model",
      rawOutputText: "{\"cover_letter\":\"...\",\"email_text\":\"...\",\"application_summary\":\"...\"}",
      wasOpenAIUsed: true
    });

    const result = await generateApplicationPackage(resumeText, jobDescription);

    expect(result.documents.coverLetter).not.toContain("this week");
    expect(result.documents.applicationEmail).not.toContain("this week");
    expect(result.documents.coverLetter).toContain(
      "Would you be available for a short Zoom call to discuss the role?"
    );
    expect(result.documents.applicationEmail).toContain(
      "Would you be available for a short Zoom call to discuss the role?"
    );
  });

  it("falls back to Dear Hiring Team when the parsed company looks like a location", async () => {
    const noisyLocationJobDescription = `
AI Engineer
Berlin, Berlin, Germany

Key Responsibilities:
- Build backend systems and internal tools.
`;

    const result = await generateApplicationPackage(
      resumeText,
      noisyLocationJobDescription
    );

    expect(result.documents.coverLetter).toMatch(/^Dear Hiring Team,/);
    expect(result.documents.coverLetter).not.toMatch(
      /^Dear Berlin, Berlin, Germany Hiring Team,/
    );
  });

  it("does not inject the legacy cover letter CTA", async () => {
    const result = await generateApplicationPackage(resumeText, jobDescription);

    expect(result.documents.coverLetter).not.toContain(
      "I’d be happy to discuss the role in more detail or walk you through a relevant project over a short Zoom call."
    );
  });
});
