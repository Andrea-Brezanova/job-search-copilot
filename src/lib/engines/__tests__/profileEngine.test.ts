import { describe, expect, it } from "vitest";
import { parseProfileText } from "@/lib/engines/profileEngine";

describe("parseProfileText", () => {
  it("does not parse the resume headline as the candidate name", async () => {
    const parsed = await parseProfileText(`
Junior Software Developer | Python, Django, SQL | Data & Automation Focus
Summary
Early-career developer with internship experience building internal tools.
andrea.brezan@gmail.com
LinkedIn | GitHub
`);

    expect(parsed.name).toBe("");
    expect(parsed.name).not.toContain("Junior Software Developer");
  });
});
