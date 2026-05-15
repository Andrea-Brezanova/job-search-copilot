import type {
  ExperienceEvidenceCard,
  FitAnalysis,
  ParsedJob,
  ParsedProfile,
  PositioningStrategy,
  TransferablePositioningMatch,
} from "@/lib/types";

type PositioningInput = {
  parsedProfile: ParsedProfile;
  parsedJob: ParsedJob;
  fitAnalysis: FitAnalysis;
  experiences: ExperienceEvidenceCard[];
  resumeText?: string;
  jobDescriptionText?: string;
};

type BusinessShapeBridge = {
  needs: string[];
  evidence: string[];
  bridge: string;
};

const BUSINESS_SHAPE_BRIDGES: BusinessShapeBridge[] = [
  {
    needs: ["workflow", "process", "operations", "coordination", "administrative"],
    evidence: ["workflow", "procurement", "automation", "manual", "internal tool"],
    bridge: "shows experience improving operational workflows and reducing manual work",
  },
  {
    needs: ["reporting", "data", "crm", "analysis", "accuracy"],
    evidence: ["database", "sql", "postgresql", "mysql", "mariadb", "data integrity", "structured data"],
    bridge: "shows structured data work, data accuracy, and information organization",
  },
  {
    needs: ["stakeholder", "communication", "documentation", "support"],
    evidence: ["internal users", "support", "documentation", "cross-functional", "customer"],
    bridge: "shows user-facing communication and documentation discipline",
  },
  {
    needs: ["tool", "system", "platform", "operations", "business user"],
    evidence: ["django", "python", "web application", "admin panel", "internal tool"],
    bridge: "shows experience building internal tooling that supports business users",
  },
  {
    needs: ["quality", "uat", "testing", "validation"],
    evidence: ["qa", "validate", "testing", "debug", "data integrity"],
    bridge: "shows testing, validation, and data-quality support experience",
  },
];

const HIGH_SEVERITY_GAP_TOKENS = ["required", "must", "crm", "marketing", "salesforce"];

export type { PositioningStrategy } from "@/lib/types";

export function createPositioningStrategy({
  parsedProfile,
  parsedJob,
  fitAnalysis,
  experiences,
  resumeText = "",
  jobDescriptionText = "",
}: PositioningInput): PositioningStrategy {
  const jobNeeds = inferJobNeeds(parsedJob, jobDescriptionText);
  const evidenceCorpus = buildEvidenceCorpus(parsedProfile, experiences, resumeText);
  const directMatches = buildDirectMatches(jobNeeds, evidenceCorpus);
  const transferableMatches = buildTransferableMatches(jobNeeds, evidenceCorpus);
  const gaps = buildPositioningGaps(jobNeeds, directMatches, transferableMatches, fitAnalysis);

  const matchLevel = determineMatchLevel(
    fitAnalysis.fitScore,
    directMatches.length,
    transferableMatches.length
  );

  return {
    matchLevel,
    generationMode: determineGenerationMode(matchLevel),
    directMatches,
    transferableMatches,
    adjacentStrengths: buildAdjacentStrengths(parsedProfile, fitAnalysis, transferableMatches),
    gaps,
    strongestApplicationAngle: buildStrongestApplicationAngle(
      matchLevel,
      directMatches,
      transferableMatches,
      parsedProfile,
      parsedJob
    ),
    recommendedTone: determineRecommendedTone(matchLevel, parsedProfile),
    coverLetterStrategy: buildCoverLetterStrategy(
      matchLevel,
      directMatches,
      transferableMatches,
      gaps
    ),
    evidenceToUse: buildEvidenceToUse(
      parsedProfile,
      experiences,
      directMatches,
      transferableMatches
    ),
    claimsToAvoid: buildClaimsToAvoid(gaps, parsedJob, jobDescriptionText),
  };
}

function inferJobNeeds(parsedJob: ParsedJob, jobDescriptionText: string) {
  const explicit = dedupeStrings([
    ...parsedJob.requirements,
    ...parsedJob.responsibilities,
    ...parsedJob.keywords,
  ]);
  const lowerText = jobDescriptionText.toLowerCase();
  const hiddenNeeds: string[] = [];

  if (/stakeholder|cross-functional|business and technical|internal teams/i.test(jobDescriptionText)) {
    hiddenNeeds.push("stakeholder coordination");
  }
  if (/report|status|tracking/i.test(lowerText)) {
    hiddenNeeds.push("reporting");
  }
  if (/process|workflow|improve|delivery/i.test(lowerText)) {
    hiddenNeeds.push("process improvement");
  }
  if (/document|spec|brd|confluence/i.test(lowerText)) {
    hiddenNeeds.push("documentation");
  }
  if (/communication|collaborate|work closely/i.test(lowerText)) {
    hiddenNeeds.push("communication");
  }
  if (/problem|analysis|insight/i.test(lowerText)) {
    hiddenNeeds.push("structured problem-solving");
  }
  if (/operations|procurement|administrative/i.test(lowerText)) {
    hiddenNeeds.push("business operations");
  }
  if (/support|customer|user/i.test(lowerText)) {
    hiddenNeeds.push("user support");
  }
  if (/data|reporting|crm|spreadsheet|excel/i.test(lowerText)) {
    hiddenNeeds.push("structured data");
  }
  if (/translate requirements|functional specs|business and technical/i.test(lowerText)) {
    hiddenNeeds.push("technical-business bridge");
  }

  return dedupeStrings([...explicit, ...hiddenNeeds]).slice(0, 12);
}

function buildEvidenceCorpus(
  parsedProfile: ParsedProfile,
  experiences: ExperienceEvidenceCard[],
  resumeText: string
) {
  return dedupeStrings([
    parsedProfile.summary,
    ...parsedProfile.highlights,
    ...parsedProfile.skills,
    ...parsedProfile.keywords,
    ...experiences.flatMap((experience) => [
      experience.role,
      experience.organization,
      experience.context,
      ...experience.actions,
      experience.outcome ?? "",
      ...experience.skills,
    ]),
    ...resumeText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 20)
      .slice(0, 20),
  ]).filter(Boolean);
}

function buildDirectMatches(jobNeeds: string[], evidenceCorpus: string[]) {
  return jobNeeds
    .map((need) => {
      const normalizedNeed = normalizeText(need);
      const evidence = evidenceCorpus.find((item) =>
        normalizeText(item).includes(normalizedNeed)
      );

      return evidence ? { jobNeed: need, resumeEvidence: evidence } : null;
    })
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .slice(0, 6);
}

function buildTransferableMatches(jobNeeds: string[], evidenceCorpus: string[]) {
  const matches = BUSINESS_SHAPE_BRIDGES.flatMap((bridge) => {
    const matchedNeeds = jobNeeds.filter((need) =>
      bridge.needs.some((token) => normalizeText(need).includes(token))
    );
    const matchedEvidence = evidenceCorpus.filter((item) =>
      bridge.evidence.some((token) => normalizeText(item).includes(token))
    );

    if (matchedNeeds.length === 0 || matchedEvidence.length === 0) {
      return [];
    }

    return matchedNeeds.map((need, index) => ({
      jobNeed: need,
      resumeEvidence: matchedEvidence[index % matchedEvidence.length],
      bridgeExplanation: bridge.bridge,
    }));
  });

  return dedupeTransferableMatches(matches).slice(0, 6);
}

function buildPositioningGaps(
  jobNeeds: string[],
  directMatches: PositioningStrategy["directMatches"],
  transferableMatches: PositioningStrategy["transferableMatches"],
  fitAnalysis: FitAnalysis
): PositioningStrategy["gaps"] {
  const matched = new Set(
    [...directMatches, ...transferableMatches].map((match) =>
      normalizeText(match.jobNeed)
    )
  );
  const rawGaps = dedupeStrings([
    ...jobNeeds,
    ...fitAnalysis.gaps.map((gap) => gap.replace(/^Missing or unclear evidence for required skill:\s*/i, "").replace(/\.$/, "")),
  ]).filter((need) => !matched.has(normalizeText(need)));

  return rawGaps.slice(0, 5).map((requirement) => {
    const severity: "low" | "medium" | "high" = HIGH_SEVERITY_GAP_TOKENS.some((token) =>
      normalizeText(requirement).includes(token)
    )
      ? "high"
      : directMatches.length > 0
        ? "low"
        : "medium";

    return {
      requirement,
      severity,
      handlingStrategy:
        "Acknowledge the gap honestly, then connect nearby evidence and motivation to learn quickly.",
    };
  });
}

function determineMatchLevel(
  fitScore: number,
  directCoverage: number,
  transferableCoverage: number
): PositioningStrategy["matchLevel"] {
  if (fitScore >= 75 || directCoverage >= 4 || (fitScore >= 60 && directCoverage >= 2)) {
    return "strong";
  }

  if (fitScore >= 45 || directCoverage >= 2) {
    return "partial";
  }

  if (transferableCoverage >= 2 || fitScore >= 25) {
    return "transferable";
  }

  return "weak";
}

function determineGenerationMode(
  matchLevel: PositioningStrategy["matchLevel"]
): PositioningStrategy["generationMode"] {
  switch (matchLevel) {
    case "strong":
      return "strong_match";
    case "partial":
      return "partial_match";
    case "transferable":
      return "transferable_positioning";
    default:
      return "honest_stretch";
  }
}

function buildAdjacentStrengths(
  parsedProfile: ParsedProfile,
  fitAnalysis: FitAnalysis,
  transferableMatches: PositioningStrategy["transferableMatches"]
) {
  const derivedStrengths = [
    ...fitAnalysis.strengths.map((item) => item.replace(/\.$/, "")),
    ...parsedProfile.highlights.filter((item) =>
      /(workflow|process|support|data|communication|documentation|cross-functional)/i.test(item)
    ),
    ...transferableMatches.map((match) => match.bridgeExplanation),
  ];

  return dedupeStrings(derivedStrengths).slice(0, 6);
}

function buildStrongestApplicationAngle(
  matchLevel: PositioningStrategy["matchLevel"],
  directMatches: PositioningStrategy["directMatches"],
  transferableMatches: PositioningStrategy["transferableMatches"],
  parsedProfile: ParsedProfile,
  parsedJob: ParsedJob
) {
  if (matchLevel === "strong" && directMatches[0]) {
    return `direct experience aligned with ${parsedJob.title}, especially ${directMatches[0].jobNeed}`;
  }

  if (matchLevel === "partial" && directMatches[0]) {
    return `a mix of relevant hands-on experience and growth potential for ${parsedJob.title}`;
  }

  if (transferableMatches[0]) {
    return `a technical-business bridge built around ${transferableMatches[0].bridgeExplanation}`;
  }

  return `a motivated transition supported by ${parsedProfile.experienceLevel.toLowerCase()}-level experience and adaptable strengths`;
}

function determineRecommendedTone(
  matchLevel: PositioningStrategy["matchLevel"],
  parsedProfile: ParsedProfile
): PositioningStrategy["recommendedTone"] {
  if (matchLevel === "strong") {
    return "direct_match";
  }

  if (matchLevel === "partial") {
    return parsedProfile.experienceLevel === "Junior" ? "junior_growth" : "direct_match";
  }

  if (matchLevel === "transferable") {
    return "transferable_skills";
  }

  return "career_transition";
}

function buildCoverLetterStrategy(
  matchLevel: PositioningStrategy["matchLevel"],
  directMatches: PositioningStrategy["directMatches"],
  transferableMatches: PositioningStrategy["transferableMatches"],
  gaps: PositioningStrategy["gaps"]
) {
  if (matchLevel === "strong") {
    return `Lead with direct evidence such as ${directMatches
      .slice(0, 2)
      .map((match) => match.jobNeed)
      .join(" and ")} and keep the tone confident.`;
  }

  if (matchLevel === "partial") {
    return "Open with the direct overlaps, then explain why the remaining gaps are reasonable growth areas.";
  }

  if (matchLevel === "transferable") {
    return `Use transferable bridges like ${transferableMatches
      .slice(0, 2)
      .map((match) => match.bridgeExplanation)
      .join(" and ")} without claiming direct experience.`;
  }

  return `Be concise, honest, and motivated. Avoid overclaiming gaps such as ${gaps
    .slice(0, 2)
    .map((gap) => gap.requirement)
    .join(" and ")}.`;
}

function buildEvidenceToUse(
  parsedProfile: ParsedProfile,
  experiences: ExperienceEvidenceCard[],
  directMatches: PositioningStrategy["directMatches"],
  transferableMatches: PositioningStrategy["transferableMatches"]
) {
  return dedupeStrings([
    ...directMatches.map((match) => match.resumeEvidence),
    ...transferableMatches.map((match) => match.resumeEvidence),
    ...parsedProfile.highlights,
    ...experiences.flatMap((experience) => [
      experience.context,
      ...experience.actions,
      experience.outcome ?? "",
    ]),
  ])
    .filter(Boolean)
    .slice(0, 8);
}

function buildClaimsToAvoid(
  gaps: PositioningStrategy["gaps"],
  parsedJob: ParsedJob,
  jobDescriptionText: string
) {
  return dedupeStrings([
    ...gaps
      .filter((gap) => gap.severity !== "low")
      .map((gap) => `Do not claim direct experience with ${gap.requirement}.`),
    ...parsedJob.requirements
      .filter((requirement) => /crm|marketing|salesforce|campaign|ownership/i.test(requirement))
      .map((requirement) => `Do not imply ownership of ${requirement} unless the resume explicitly supports it.`),
    /marketing|campaign|crm/i.test(jobDescriptionText)
      ? "Do not claim direct campaign ownership or CRM expertise unless it appears in the resume."
      : "",
  ]).filter(Boolean);
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function dedupeTransferableMatches(matches: TransferablePositioningMatch[]) {
  const seen = new Set<string>();

  return matches.filter((match) => {
    const key = `${normalizeText(match.jobNeed)}|${normalizeText(match.resumeEvidence).slice(0, 80)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
