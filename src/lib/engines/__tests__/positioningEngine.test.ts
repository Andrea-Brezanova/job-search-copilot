import { describe, expect, it } from "vitest";

import { createPositioningStrategy } from "@/lib/engines/positioningEngine";
import type { ExperienceEvidenceCard, FitAnalysis, ParsedJob, ParsedProfile } from "@/lib/types";

const strongProfile: ParsedProfile = {
  name: "Alex Rivera",
  summary: "Backend-focused developer with Python, Django, and SQL experience.",
  skills: ["python", "django", "sql", "docker", "git"],
  experienceLevel: "Junior",
  targetRoles: ["Software Engineer"],
  highlights: [
    "Built backend tools with Django and SQL.",
    "Worked on internal services and deployment workflows.",
  ],
  keywords: ["python", "django", "sql", "docker", "git"],
};

const strongJob: ParsedJob = {
  title: "Junior Software Engineer",
  responsibilities: [
    "Build backend tools and internal services.",
    "Work with relational databases and APIs.",
  ],
  requirements: ["python", "django", "sql"],
  keywords: ["python", "django", "sql", "api"],
};

const strongFit: FitAnalysis = {
  fitScore: 84,
  strengths: ["Matches a required skill: python.", "Matches a required skill: django."],
  gaps: ["No major required-skill gaps were detected from the parsed job description."],
  recommendation: "Apply",
  reasoning: "Strong overlap across required skills.",
};

const strongExperiences: ExperienceEvidenceCard[] = [
  {
    role: "Software Development Intern",
    organization: "Internal Tools Team",
    context: "Built backend tools with Django and SQL for internal users.",
    actions: [
      "Built backend tools with Django and SQL for internal users.",
      "Worked with relational databases and internal APIs.",
    ],
    outcome: "Improved internal workflow efficiency.",
    skills: ["Django", "SQL"],
  },
];

describe("createPositioningStrategy", () => {
  it("preserves strong-match behavior when direct overlap is high", () => {
    const strategy = createPositioningStrategy({
      parsedProfile: strongProfile,
      parsedJob: strongJob,
      fitAnalysis: strongFit,
      experiences: strongExperiences,
      resumeText: strongProfile.summary,
      jobDescriptionText: strongJob.responsibilities.join("\n"),
    });

    expect(strategy.matchLevel).toBe("strong");
    expect(strategy.generationMode).toBe("strong_match");
    expect(strategy.directMatches.length).toBeGreaterThan(0);
  });

  it("positions adjacent workflow and data experience as transferable", () => {
    const profile: ParsedProfile = {
      name: "Taylor Chen",
      summary:
        "Junior application developer with Python, Django, MariaDB, Git, and Docker experience building internal workflow tools.",
      skills: ["python", "django", "mariadb", "git", "docker"],
      experienceLevel: "Junior",
      targetRoles: ["Application Developer"],
      highlights: [
        "Built an internal procurement workflow application.",
        "Designed database schema and structured messy business data.",
        "Automated manual administrative processes and worked with internal users.",
      ],
      keywords: ["python", "django", "mariadb", "workflow", "database", "automation"],
    };

    const job: ParsedJob = {
      title: "Marketing Operations Assistant",
      responsibilities: [
        "Support CRM workflows and campaign data reporting.",
        "Coordinate with stakeholders and maintain documentation.",
        "Improve marketing systems and operational processes.",
      ],
      requirements: ["communication", "reporting", "process improvement"],
      keywords: ["crm", "reporting", "documentation", "process", "coordination"],
    };

    const fit: FitAnalysis = {
      fitScore: 28,
      strengths: ["The profile shows some transferable experience, but direct overlap is limited."],
      gaps: [
        "Missing or unclear evidence for required skill: communication.",
        "Missing or unclear evidence for required skill: reporting.",
      ],
      recommendation: "Skip",
      reasoning: "Direct overlap is limited, but some adjacent experience exists.",
    };

    const experiences: ExperienceEvidenceCard[] = [
      {
        role: "Junior Application Developer",
        organization: "Operations Team",
        context: "Built an internal procurement workflow application for internal users.",
        actions: [
          "Automated manual administrative processes.",
          "Designed database schema and cleaned structured business data.",
          "Worked with internal users to support workflow changes.",
        ],
        outcome: "Improved workflow efficiency and reduced manual work.",
        skills: ["Python", "Django", "MariaDB"],
      },
    ];

    const strategy = createPositioningStrategy({
      parsedProfile: profile,
      parsedJob: job,
      fitAnalysis: fit,
      experiences,
      resumeText: `${profile.summary}\n${profile.highlights.join("\n")}`,
      jobDescriptionText: `${job.title}\n${job.responsibilities.join("\n")}`,
    });

    expect(strategy.matchLevel).toBe("transferable");
    expect(strategy.generationMode).toBe("transferable_positioning");
    expect(strategy.strongestApplicationAngle).toMatch(
      /technical-business bridge|workflow|process|data/i
    );
    expect(
      strategy.transferableMatches.some((match) =>
        /workflow|process|structured data|internal tooling|supports business users/i.test(
          `${match.bridgeExplanation} ${match.resumeEvidence}`
        )
      )
    ).toBe(true);
    expect(
      strategy.evidenceToUse.some((item) =>
        /procurement workflow|database schema|manual administrative processes/i.test(item)
      )
    ).toBe(true);
    expect(
      strategy.claimsToAvoid.some((claim) => /crm|campaign/i.test(claim))
    ).toBe(true);
  });

  it("stays honest on weak matches and produces claims to avoid", () => {
    const profile: ParsedProfile = {
      name: "Jordan Lee",
      summary: "Customer support specialist with troubleshooting and documentation experience.",
      skills: ["communication", "support"],
      experienceLevel: "Junior",
      targetRoles: ["Customer Support Specialist"],
      highlights: ["Documented support issues and helped users resolve technical problems."],
      keywords: ["communication", "support", "documentation"],
    };

    const job: ParsedJob = {
      title: "Senior Machine Learning Engineer",
      responsibilities: [
        "Design deep learning systems for production use.",
        "Own model training pipelines and experimentation frameworks.",
      ],
      requirements: ["python", "pytorch", "mlops"],
      keywords: ["python", "pytorch", "mlops", "machine learning"],
    };

    const fit: FitAnalysis = {
      fitScore: 8,
      strengths: ["The profile shows some transferable experience, but direct overlap is limited."],
      gaps: [
        "Missing or unclear evidence for required skill: python.",
        "Missing or unclear evidence for required skill: pytorch.",
        "Missing or unclear evidence for required skill: mlops.",
      ],
      recommendation: "Skip",
      reasoning: "Direct overlap is minimal.",
    };

    const experiences: ExperienceEvidenceCard[] = [
      {
        role: "Support Specialist",
        organization: "Help Desk",
        context: "Supported users and documented recurring issues.",
        actions: [
          "Resolved support tickets.",
          "Documented troubleshooting steps.",
        ],
        outcome: "Improved issue resolution consistency.",
        skills: [],
      },
    ];

    const strategy = createPositioningStrategy({
      parsedProfile: profile,
      parsedJob: job,
      fitAnalysis: fit,
      experiences,
      resumeText: profile.summary,
      jobDescriptionText: `${job.title}\n${job.responsibilities.join("\n")}\n${job.requirements.join("\n")}`,
    });

    expect(strategy.matchLevel).toBe("weak");
    expect(strategy.generationMode).toBe("honest_stretch");
    expect(strategy.claimsToAvoid.length).toBeGreaterThan(0);
    expect(
      strategy.claimsToAvoid.some((claim) => /python|pytorch|mlops/i.test(claim))
    ).toBe(true);
  });
});
