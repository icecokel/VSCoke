import { randomUUID } from "node:crypto";

export const seedSyntheticResumes = async (apiUrl, writeKey, testDatabaseUrl) => {
  const database = new URL(testDatabaseUrl);
  const api = new URL(apiUrl);
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    database.search ||
    !decodeURIComponent(database.pathname).endsWith("_test") ||
    !["127.0.0.1", "localhost", "[::1]"].includes(api.hostname) ||
    api.protocol !== "http:" ||
    writeKey.length < 32
  ) {
    throw new Error(
      "Synthetic resume registration requires a loopback API and disposable _test database",
    );
  }

  const call = async (path, method = "GET", payload) => {
    const response = await fetch(new URL(path, api), {
      method,
      headers: { Authorization: `Bearer ${writeKey}`, "Content-Type": "application/json" },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    if (!response.ok)
      throw new Error(
        `Synthetic resume registration failed: ${method} ${path} (${response.status})`,
      );
    return (await response.json()).data;
  };
  const runId = randomUUID();
  const experienceId = randomUUID();
  const factId = randomUUID();
  const bulletId = randomUUID();
  const keywordId = randomUUID();
  await call("/career-data", "PUT", {
    experiences: [
      {
        id: experienceId,
        expectedRevision: 0,
        company: "Synthetic Example Co",
        title: "Synthetic test experience",
        publicTitle: "Synthetic public project",
      },
    ],
    facts: [
      {
        id: factId,
        expectedRevision: 0,
        experienceId,
        kind: "action",
        content: "Synthetic project evidence for integrated browser verification",
        verificationStatus: "confirmed",
        visibility: "public",
        evidence: [{ kind: "document", locator: "synthetic-test-fixture", as_of: "2026-10-27" }],
        metric: null,
        claimBoundary: "Synthetic test data only",
      },
    ],
    bullets: [
      {
        id: bulletId,
        expectedRevision: 0,
        experienceId,
        text: "Synthetic approved career bullet",
        status: "ready",
        visibility: "public",
        sourceRefs: [],
        facts: [{ factId, factRevision: 1 }],
        keywordIds: [keywordId],
      },
    ],
    keywords: [
      {
        id: keywordId,
        expectedRevision: 0,
        key: `synthetic-${runId}`,
        label: "Synthetic TypeScript",
        kind: "technology",
        aliases: [],
      },
    ],
  });
  const dependencies = [{ kind: "bullet", id: bulletId, revision: 1 }];
  const careerSlug = `synthetic-project-${runId}`;
  const personalSlug = `synthetic-personal-${runId}`;
  for (const slug of [careerSlug, personalSlug]) {
    await call(`/resume-management/details/${slug}`, "PUT", {
      expectedRevision: 0,
      title: `Synthetic detail ${slug}`,
      content:
        "## Synthetic project detail\n\nSynthetic approved project evidence for browser verification.",
      visibility: "public",
      dependencies,
    });
  }
  const resumes = await call("/resume-management/resumes");
  const selections = [
    ...["pe", "fe", "nexon"].flatMap(key =>
      ["ko-KR", "en-US", "ja-JP"].map(locale => ({ key, locale })),
    ),
    { key: "ko-only", locale: "ko-KR" },
    { key: "private", locale: "ko-KR" },
  ];
  for (const { key, locale } of selections) {
    const existing = resumes.find(resume => resume.key === key && resume.locale === locale);
    await call("/resume-management/versions", "POST", {
      key,
      locale,
      kind: key === "nexon" ? "targeted" : "base",
      track: key === "fe" ? "front-end" : "product-engineer",
      targetKey: key === "nexon" ? "synthetic-target" : null,
      visibility: key === "private" ? "private" : "public",
      expectedRevision: existing?.revision ?? 0,
      expectedCurrentVersionId: existing?.currentVersionId ?? null,
      versionName: `synthetic-${runId}`,
      parentVersionId: existing?.currentVersionId ?? null,
      dependencies,
      content: {
        name: `Synthetic ${key}`,
        title: `Synthetic ${key} · ${locale}`,
        contact: { email: "synthetic@example.test", phone: "+000000000" },
        introduction: [`Synthetic ${key} career summary for ${locale}`],
        totalExperience: "Synthetic period",
        lastUpdated: "2026.10",
        careers: [
          {
            id: "synthetic-career",
            company: "Synthetic Example Co",
            period: "2026",
            employmentType: "Synthetic",
            role: "Synthetic developer",
            projects: [
              {
                id: "synthetic-project",
                title: "Synthetic public project",
                fileRef: careerSlug,
                descriptions: [
                  {
                    subtitle: "Synthetic implementation",
                    detail: "Synthetic approved career evidence",
                    skills: "TypeScript",
                    tasks: ["Synthetic browser verification"],
                  },
                ],
              },
            ],
          },
        ],
        education: [],
        skills: ["TypeScript"],
        certifications: [],
        links: [],
        personalProjects: [
          {
            id: "synthetic-personal",
            title: "Synthetic personal project",
            description: "Synthetic personal project description",
            fileRef: personalSlug,
          },
        ],
      },
    });
  }
  await call(`/career-data/facts/${factId}/publish`, "POST", { expectedRevision: 1 });
};
