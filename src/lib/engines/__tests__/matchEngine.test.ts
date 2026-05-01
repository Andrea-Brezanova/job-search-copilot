import { describe, expect, it } from "vitest";
import { parseJobText } from "@/lib/engines/matchEngine";

describe("parseJobText", () => {
  it("rejects LinkedIn metadata as company and keeps the exact role", () => {
    const parsed = parseJobText(`
Python Developer
San Francisco, CA · Reposted 2 days ago · Over 100 applicants
Promoted by hirer · Actively reviewing applicants

Save Python Developer at Diligente Technologies

About the job
Key Responsibilities:
- Design, develop, and maintain Python-based tools and pipelines.
- Build and support REST APIs for internal users.
- Work with SQL and relational databases.
`);

    expect(parsed.title).toBe("Python Developer");
    expect(parsed.company).toBe("Diligente Technologies");
    expect(parsed.company).not.toMatch(/Reposted|applicants|Promoted|Actively reviewing/);
  });

  it("accepts short assistant titles without falling back to this role", () => {
    const parsed = parseJobText(`
Marketing Operations Assistant

Support CRM workflows, campaign data, reporting, stakeholder coordination, documentation, process improvement, and marketing systems.
`);

    expect(parsed.title).toBe("Marketing Operations Assistant");
  });
});
