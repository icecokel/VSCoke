import assert from "node:assert/strict";
import test from "node:test";
import type { ResumeDocument } from "@/services/resume-service";
import { buildResumeSearchItems } from "./search-index";

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
      "/readme?resume=fe",
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
