import assert from "node:assert/strict";
import test from "node:test";
import type { ResumeDocument } from "@/services/resume-service";
import { getResumeProjectAnchorIds } from "./project-anchor";
import { buildResumeSearchItems } from "./search-index";
import { startResumeFixture } from "../../../../scripts/playwright-resume-fixture.mjs";

const document: ResumeDocument = {
  documentId: "document",
  key: "fe",
  versionId: "version",
  versionName: "v1",
  contentHash: "hash",
  locale: "en-US",
  name: "DB name",
  title: "DB title",
  contact: { email: "db@example.com", phone: "123" },
  introduction: ["DB introduction"],
  totalExperience: "1 year",
  lastUpdated: "2026.09",
  careers: [
    {
      id: "career",
      company: "DB company",
      period: "2026",
      role: "Developer",
      employmentType: "Full time",
      projects: [
        {
          id: "linked",
          title: "DB project",
          fileRef: "db-project",
          descriptions: [{ subtitle: "DB subtitle", tasks: ["DB task"] }],
        },
        { id: "unlinked", title: "Other project", descriptions: [] },
      ],
    },
  ],
  education: [],
  skills: ["DB skill"],
  certifications: [],
  links: [],
  personalProjects: [
    {
      id: "personal",
      title: "DB personal",
      description: "DB description",
      fileRef: "personal-detail",
    },
  ],
};

test("DB 이력서의 본문과 순서 및 회사·개인 프로젝트 상세 경로를 검색에 반영한다", () => {
  const items = buildResumeSearchItems(document);
  assert.deepEqual(
    items.map(item => item.path),
    [
      "/readme?resume=fe",
      "/resume/db-project?resume=fe",
      "/readme?resume=fe#resume-project%3Acareer%3Aunlinked",
      "/resume/personal-detail?resume=fe",
    ],
  );
  assert.equal(items[0].description, "DB name DB introduction");
  assert.deepEqual(items[0].keywords, ["DB title", "DB skill"]);
  assert.equal(items[1].title, "DB company · DB project");
  assert.ok(items[1].keywords?.includes("DB task"));
  assert.equal(items[3].description, "DB description");

  const changed = buildResumeSearchItems({ ...document, introduction: ["Changed in DB"] });
  assert.equal(changed[0].description, "DB name Changed in DB");
});

test("프로젝트 anchor는 세 언어와 PE/FE 문서에서 같고 문서 안에서 고유하다", async () => {
  const { server, url } = await startResumeFixture();
  try {
    let expected: string[] | undefined;
    let expectedIds: string[] | undefined;
    for (const key of ["pe", "fe"]) {
      for (const locale of ["ko-KR", "en-US", "ja-JP"]) {
        const { data }: { data: ResumeDocument } = await (
          await fetch(`${url}/resume?locale=${locale}&resume=${key}`)
        ).json();
        const ids = getResumeProjectAnchorIds(data).flat();
        assert.equal(new Set(ids).size, ids.length);
        if (expectedIds) assert.deepEqual(ids, expectedIds);
        else expectedIds = ids;
        const items = buildResumeSearchItems(data).filter(item =>
          item.id.startsWith("profile:project:"),
        );
        const fragments = items
          .filter(item => item.path.startsWith("/readme?"))
          .map(item => new URL(item.path, url).hash);
        assert.ok(fragments.every(fragment => fragment.length > 1));
        assert.equal(new Set(fragments).size, fragments.length);
        if (expected) assert.deepEqual(fragments, expected);
        else expected = fragments;
      }
    }
  } finally {
    server.close();
  }
});

test("고유한 회사와 프로젝트 조합은 번역·순서와 무관하다", () => {
  const career = document.careers[0];
  const projects = [
    { id: "shared", title: "First", descriptions: [] },
    { id: "part:unique", title: "Second", descriptions: [] },
  ];
  const source = {
    ...document,
    careers: [
      { ...career, id: "company:part", projects: [projects[0]] },
      { ...career, id: "company", projects },
    ],
  };
  const paths = (resume: ResumeDocument) =>
    buildResumeSearchItems(resume)
      .filter(item => item.id.startsWith("profile:project:"))
      .map(item => item.path)
      .sort();
  const original = paths(source);
  assert.equal(new Set(original).size, 3);
  assert.deepEqual(
    paths({
      ...source,
      careers: source.careers.toReversed().map(item => ({
        ...item,
        company: "翻訳",
        projects: item.projects.toReversed().map(project => ({ ...project, title: "Translated" })),
      })),
    }),
    original,
  );
});
