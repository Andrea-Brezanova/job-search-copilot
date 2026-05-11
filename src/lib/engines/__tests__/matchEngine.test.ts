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

  it("keeps longer role titles that include specialty context and remote suffixes", () => {
    const parsed = parseJobText(`
Senior Product Designer, Growth Platform, Remote

About the job
Key Responsibilities:
- Lead product design work across activation and lifecycle surfaces.
- Collaborate closely with product and engineering partners.
`);

    expect(parsed.title).toBe("Senior Product Designer, Growth Platform");
  });

  it("accepts data scientist titles with gender suffixes", () => {
    const parsed = parseJobText(`
Data Scientist (f/m/d)

About the job
Requirements:
- Build predictive models and experiments.
`);

    expect(parsed.title).toBe("Data Scientist (f/m/d)");
    expect(parsed.company).toBeUndefined();
  });

  it("accepts german software developer titles with technology suffixes", () => {
    const parsed = parseJobText(`
Softwareentwickler (m/w/d) - Python/Django

About the job
Requirements:
- Develop internal business applications in Python and Django.
`);

    expect(parsed.title).toBe("Softwareentwickler (m/w/d) - Python/Django");
  });

  it("does not use a location-only line as the title", () => {
    const parsed = parseJobText(`
Berlin, Berlin, Germany
Apply
Save

Data Scientist (f/m/d)

About the job
Requirements:
- Build predictive models and experiments.
`);

    expect(parsed.title).toBe("Data Scientist (f/m/d)");
  });

  it("does not use LinkedIn action or section lines as the title", () => {
    const parsed = parseJobText(`
Apply
Save
About the job
Requirements
Tasks

AI Operations Associate (m/w/d)

Berlin, Berlin, Germany (Hybrid)
`);

    expect(parsed.title).toBe("AI Operations Associate (m/w/d)");
    expect(parsed.title).not.toBe("Apply");
    expect(parsed.title).not.toBe("Save");
    expect(parsed.title).not.toBe("About the job");
    expect(parsed.title).not.toBe("Requirements");
    expect(parsed.title).not.toBe("Tasks");
  });

  it("parses noisy LinkedIn postings without mistaking headings for the role or company", () => {
    const parsed = parseJobText(`
AI Operations Associate (m/w/d)

inca • Berlin, Berlin, Germany (Hybrid)

Save
Apply

Company logo for, inca.
inca

AI Operations Associate (m/w/d)

Berlin, Berlin, Germany · 1 week ago · Over 100 people clicked apply

Responses managed off LinkedIn

Tasks
What You'll Do 💼

(Internship) → Year 1 → Year 2+ 📈
`);

    expect(parsed.title).toBe("AI Operations Associate (m/w/d)");
    expect(parsed.company).toBe("inca");
  });
});
