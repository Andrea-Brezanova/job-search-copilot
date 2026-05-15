import { describe, expect, it } from "vitest";
import { inspectGenerationInputs } from "@/lib/engines/applicationEngine/debug";

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

describe("inspectGenerationInputs", () => {
  it("returns deterministic parser and payload debug fields without calling OpenAI", async () => {
    const snapshot = await inspectGenerationInputs(
      resumeText,
      `
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
`
    );

    expect(snapshot.rawJobLinesPreview[0]).toBe("AI Operations Associate (m/w/d)");
    expect(snapshot.parsedJob.title).toBe("AI Operations Associate (m/w/d)");
    expect(snapshot.parsedJob.company).toBe("inca");
    expect(snapshot.payload.parsedRole).toBe("AI Operations Associate (m/w/d)");
    expect(snapshot.validation.ok).toBe(true);
    expect(snapshot.storySelection.hasPrimaryStory).toBe(true);
  });
});
