import assert from "node:assert/strict";
import test from "node:test";
import type { ResumeDocument } from "@/services/resume-service";
import { getResumeProjectAnchorIds } from "./project-anchor";
import { buildResumeSearchItems } from "./search-index";

const documentWithProjects = (groups: { id: string; projects: string[] }[]): ResumeDocument => ({
  documentId: "document",
  key: "pe",
  versionId: "version",
  versionName: "v1",
  contentHash: "hash",
  locale: "ko-KR",
  name: "Name",
  title: "Title",
  contact: { email: "test@example.com", phone: "123" },
  introduction: [],
  totalExperience: "1 year",
  lastUpdated: "2026.09",
  careers: groups.map(group => ({
    id: group.id,
    company: "Company",
    period: "2026",
    role: "Developer",
    employmentType: "Full time",
    projects: group.projects.map(id => ({ id, title: "Project", descriptions: [] })),
  })),
  education: [],
  skills: [],
  certifications: [],
  links: [],
  personalProjects: [],
});

const expectAnchors = (document: ResumeDocument, expected: string[]) => {
  const items = buildResumeSearchItems(document).slice(1);
  const ids = items.map(item =>
    decodeURIComponent(new URL(item.path, "http://localhost").hash.slice(1)),
  );
  assert.deepEqual(getResumeProjectAnchorIds(document).flat(), expected);
  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(items.map(item => item.id)).size, ids.length);
};

test("정상 ID는 회사와 프로젝트 조합을 사용한다", () => {
  expectAnchors(
    documentWithProjects([
      { id: "first", projects: ["shared", "unique"] },
      { id: "second", projects: ["shared"] },
    ]),
    ["resume-project:first:shared", "resume-project:first:unique", "resume-project:second:shared"],
  );
});

test("빈 ID와 공백 ID는 예외 없이 위치 기반 앵커를 사용한다", () => {
  expectAnchors(documentWithProjects([{ id: "career", projects: ["", "  ", "valid"] }]), [
    "resume-project:0-0",
    "resume-project:0-1",
    "resume-project:career:valid",
  ]);
});

test("같은 회사의 중복 프로젝트 ID는 모두 위치 기반 앵커를 사용한다", () => {
  expectAnchors(documentWithProjects([{ id: "career", projects: ["duplicate", "duplicate"] }]), [
    "resume-project:0-0",
    "resume-project:0-1",
  ]);
});

test("회사 ID 중복으로 조합이 겹치면 문서 전체에서 위치 기반 앵커를 사용한다", () => {
  expectAnchors(
    documentWithProjects([
      { id: "career", projects: ["shared", "first"] },
      { id: "career", projects: ["shared", "second"] },
    ]),
    [
      "resume-project:0-0",
      "resume-project:career:first",
      "resume-project:1-0",
      "resume-project:career:second",
    ],
  );
});

test("구분자가 포함된 고유 조합은 각 ID를 인코딩해 구분한다", () => {
  expectAnchors(
    documentWithProjects([
      { id: "company:part", projects: ["shared", "shared-2"] },
      { id: "company", projects: ["part:shared"] },
      { id: "company", projects: ["part:shared-2"] },
    ]),
    [
      "resume-project:company%3Apart:shared",
      "resume-project:company%3Apart:shared-2",
      "resume-project:company:part%3Ashared",
      "resume-project:company:part%3Ashared-2",
    ],
  );
});

test("구분자가 포함된 고유 조합은 정순·역순에서 같은 앵커를 유지한다", () => {
  const groups = [
    { id: "company:part", projects: ["shared"] },
    { id: "company", projects: ["part:shared"] },
  ];
  const expected = ["resume-project:company%3Apart:shared", "resume-project:company:part%3Ashared"];
  expectAnchors(documentWithProjects(groups), expected);
  expectAnchors(documentWithProjects(groups.toReversed()), expected.toReversed());
});

test("빈 문서는 앵커 없이 처리한다", () => {
  expectAnchors(documentWithProjects([]), []);
});
