import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createResumeImportManifest } from "../apps/api/src/resume-rag/import/resume-source-item-loader";
import {
  apiDeployPaths,
  decideApiDeployment,
  getApiDeployment,
  resumeMessageKeys,
} from "./api-deploy-scope.mjs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
mkdirSync(join(root, "output"), { recursive: true });
const workflow = readFileSync(join(root, ".github/workflows/deploy-api.yml"), "utf8");
const messagePath = "apps/web/messages/ko-KR.json";
const original = { profile: { name: "이상민" }, resume: { title: "경력" }, navigation: "메뉴" };
const writeCurrentRevision = (deployDir: string, sha: string): void => {
  mkdirSync(join(deployDir, "current"), { recursive: true });
  writeFileSync(join(deployDir, "current/revision"), `${sha}\n`);
};
const decideMessage = (before: unknown, after: unknown, path = messagePath) =>
  decideApiDeployment({
    changedFiles: [path],
    messages: { [path]: { before: JSON.stringify(before), after: JSON.stringify(after) } },
  });

test("세 언어의 UI 전용 변경은 API 배포를 생략한다", () => {
  for (const locale of ["ko-KR", "en-US", "ja-JP"]) {
    assert.equal(
      decideMessage(
        original,
        { ...original, navigation: "새 메뉴" },
        `apps/web/messages/${locale}.json`,
      ).shouldDeploy,
      false,
    );
  }
});

test("loader가 읽는 키의 중첩 값 변경·추가·삭제는 배포한다", () => {
  for (const key of resumeMessageKeys) {
    const removed = Object.fromEntries(Object.entries(original).filter(([name]) => name !== key));
    for (const after of [{ ...original, [key]: { nested: ["새 이력"] } }, removed]) {
      assert.equal(decideMessage(original, after).shouldDeploy, true);
      assert.equal(decideMessage(after, original).shouldDeploy, true);
    }
  }
});

test("JSON 공백과 객체 키 순서 변경만으로 배포하지 않는다", () => {
  assert.equal(
    decideApiDeployment({
      changedFiles: [messagePath],
      messages: {
        [messagePath]: {
          before: JSON.stringify(original),
          after: JSON.stringify(
            { navigation: "메뉴", resume: { title: "경력" }, profile: { name: "이상민" } },
            null,
            2,
          ),
        },
      },
    }).shouldDeploy,
    false,
  );
});

test("기존 API 코드·계약·배포 설정·이력 원본 경로는 계속 배포한다", () => {
  for (const pattern of apiDeployPaths.filter(path => !path.includes("messages/"))) {
    const path = pattern.replace("**", ".fixture");
    assert.equal(decideApiDeployment({ changedFiles: [path] }).shouldDeploy, true, path);
  }
});

test("UI 변경과 API 변경이 섞이면 배포하고 일반 웹 변경은 무시한다", () => {
  const input = {
    changedFiles: [messagePath, "apps/web/src/app/page.tsx", "apps/web/messages/nested/other.json"],
    messages: {
      [messagePath]: {
        before: JSON.stringify(original),
        after: JSON.stringify({ ...original, navigation: "새 메뉴" }),
      },
    },
  };
  assert.equal(decideApiDeployment(input).shouldDeploy, false);
  assert.equal(
    decideApiDeployment({ ...input, changedFiles: [...input.changedFiles, "apps/api/src/main.ts"] })
      .shouldDeploy,
    true,
  );
  assert.equal(decideApiDeployment({ changedFiles: [] }).shouldDeploy, false);
});

test("여러 메시지 파일 중 하나라도 이력 원본이 바뀌면 배포한다", () => {
  const secondPath = "apps/web/messages/en-US.json";
  assert.equal(
    decideApiDeployment({
      changedFiles: [messagePath, secondPath],
      messages: {
        [messagePath]: { before: JSON.stringify(original), after: JSON.stringify(original) },
        [secondPath]: {
          before: JSON.stringify(original),
          after: JSON.stringify({ ...original, resume: {} }),
        },
      },
    }).shouldDeploy,
    true,
  );
});

test("메시지 파싱 실패·추가·삭제·잘못된 루트는 안전하게 배포한다", () => {
  for (const invalid of [undefined, "{", "null", "[]", '"text"']) {
    for (const message of [
      { before: invalid, after: JSON.stringify(original) },
      { before: JSON.stringify(original), after: invalid },
    ]) {
      assert.equal(
        decideApiDeployment({ changedFiles: [messagePath], messages: { [messagePath]: message } })
          .shouldDeploy,
        true,
      );
    }
  }
});

test("배포 판정의 키 범위는 실제 loader manifest와 일치한다", () => {
  const entries = createResumeImportManifest({ repoRoot: root }).filter(entry =>
    entry.sourcePath.startsWith("apps/web/messages/"),
  );
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    assert.equal(entry.parser, "json");
    assert.deepEqual(entry.jsonKeys, resumeMessageKeys, entry.sourcePath);
  }
});

test("workflow 경로 필터는 판정 스크립트와 일치하고 모든 배포 단계에 조건이 있다", () => {
  const paths = [
    ...workflow
      .split("    paths:\n")[1]
      .split("\nconcurrency:")[0]
      .matchAll(/      - "(.+)"/g),
  ].map(match => match[1]);
  assert.deepEqual(paths, apiDeployPaths);
  assert.match(workflow, /uses: actions\/checkout@v4\n        with:\n          fetch-depth: 0/);
  assert.match(workflow, /API_DEPLOY_BEFORE: \$\{\{ github\.event\.before \}\}/);
  const steps = workflow.split("      - name: ").slice(1);
  const scopeIndex = steps.findIndex(step => step.startsWith("Decide API deployment\n"));
  assert.equal(scopeIndex, 2);
  assert.match(workflow, /  workflow_dispatch:/);
  assert.match(steps[scopeIndex], /id: scope/);
  assert.match(steps[scopeIndex], /node scripts\/api-deploy-scope\.mjs/);
  assert.ok(steps.slice(scopeIndex + 1).length > 0);
  for (const step of steps.slice(scopeIndex + 1)) {
    assert.match(step, /if: steps\.scope\.outputs\.should_deploy == 'true'/, step.split("\n")[0]);
  }
});

test("성공 배포 기록 없음·잘못된 SHA·접근 불가능한 커밋은 배포한다", () => {
  const fixture = mkdtempSync(join(root, "output/vscoke-deploy-baseline-"));
  const after = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  try {
    writeCurrentRevision(fixture, after);
    for (const before of [undefined, "", "invalid", "0".repeat(40), "f".repeat(40)]) {
      if (before !== undefined) writeFileSync(join(fixture, ".last-successful-deploy"), before);
      assert.equal(
        getApiDeployment({ deployDir: fixture, before: after, after, eventName: "push", cwd: root })
          .shouldDeploy,
        true,
      );
    }
    writeFileSync(join(fixture, ".last-successful-deploy"), `${after}\n`);
    assert.equal(
      getApiDeployment({ deployDir: fixture, before: after, after, eventName: "push", cwd: root })
        .shouldDeploy,
      false,
    );
    assert.equal(
      getApiDeployment({
        deployDir: fixture,
        before: after,
        after,
        eventName: "push",
        cwd: "/nonexistent-vscoke-checkout",
      }).shouldDeploy,
      true,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("workflow 판정 단계는 push 이전 커밋이 없거나 조회 불가하면 배포하고 Actions에 이유를 남긴다", () => {
  const fixture = mkdtempSync(join(root, "output/vscoke-deploy-scope-"));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  try {
    writeCurrentRevision(fixture, head);
    writeFileSync(join(fixture, ".last-successful-deploy"), `${head}\n`);
    const step = workflow
      .split("      - name: Decide API deployment\n")[1]
      ?.split("\n      - name:")[0];
    assert.ok(step);
    const beforeVariable = step.match(/(\w+): \$\{\{ github\.event\.before \}\}/)?.[1];
    const script = step.split("        run: ")[1]?.trim();
    assert.ok(script);
    const cases = [
      { eventName: "push", before: undefined, shouldDeploy: true },
      { eventName: "push", before: "", shouldDeploy: true },
      { eventName: "push", before: "0".repeat(40), shouldDeploy: true },
      { eventName: "push", before: "invalid", shouldDeploy: true },
      { eventName: "push", before: "f".repeat(40), shouldDeploy: true },
      { eventName: "push", before: head, shouldDeploy: false },
      { eventName: "workflow_dispatch", before: undefined, shouldDeploy: true },
      { eventName: "workflow_dispatch", before: "0".repeat(40), shouldDeploy: true },
    ];
    for (const [index, { eventName, before, shouldDeploy }] of cases.entries()) {
      const output = join(fixture, `${index}-output`);
      const summary = join(fixture, `${index}-summary`);
      const stdout = execFileSync("bash", ["-eu", "-c", script], {
        cwd: root,
        env: {
          ...process.env,
          API_DEPLOY_DIR: fixture,
          API_DEPLOY_BEFORE: undefined,
          ...(beforeVariable ? { [beforeVariable]: before } : {}),
          GITHUB_SHA: head,
          GITHUB_EVENT_NAME: eventName,
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: summary,
        },
        encoding: "utf8",
      });
      const result = JSON.parse(stdout);
      assert.equal(result.shouldDeploy, shouldDeploy, `${eventName}: ${before}`);
      if (eventName === "push" && shouldDeploy) assert.match(result.reason, /이전 커밋/);
      assert.equal(readFileSync(output, "utf8"), `should_deploy=${result.shouldDeploy}\n`);
      assert.ok(readFileSync(summary, "utf8").includes(result.reason));
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

const runDeploymentStep = (name: string, deployDir: string, sha: string): void => {
  if (name === "Record successful API deployment") writeCurrentRevision(deployDir, sha);
  const step = workflow.split(`      - name: ${name}\n`)[1]?.split("\n      - name:")[0];
  const script = step?.split("        run: |\n")[1];
  assert.ok(script, `배포 단계가 없음: ${name}`);
  execFileSync("bash", ["-eu", "-c", script], {
    env: { ...process.env, API_DEPLOY_DIR: deployDir, GITHUB_SHA: sha },
  });
};

test("연속 push에서 대기 배포가 UI push로 대체되어도 누적 API 변경을 배포한다", () => {
  const fixture = mkdtempSync(join(root, "output/vscoke-deploy-queue-"));
  const [base, api, ui] = ["a", "b", "c"].map(value => value.repeat(40));
  const revisions: Record<string, Record<string, string>> = {
    [base]: { "apps/api/src/main.ts": "old", [messagePath]: JSON.stringify(original) },
    [api]: { "apps/api/src/main.ts": "new", [messagePath]: JSON.stringify(original) },
    [ui]: {
      "apps/api/src/main.ts": "new",
      [messagePath]: JSON.stringify({ ...original, navigation: "새 메뉴" }),
    },
  };
  const comparisons: string[][] = [];
  const git = (args: string[]): string => {
    if (args[0] === "show") {
      const [sha, path] = args[1].split(":");
      assert.ok(revisions[sha]?.[path]);
      return revisions[sha][path];
    }
    assert.equal(args[0], "diff");
    const [before, after] = args.slice(4, 6);
    comparisons.push([before, after]);
    return Object.keys(revisions[after])
      .filter(path => revisions[before][path] !== revisions[after][path])
      .join("\0");
  };
  const decide = (after: string, before = base) =>
    getApiDeployment({ deployDir: fixture, before, after, eventName: "push", git });
  try {
    runDeploymentStep("Record successful API deployment", fixture, base);
    assert.equal(decide(api).shouldDeploy, true);
    // B의 대기 실행은 취소되고 C가 실행되어도 성공 기록은 A다.
    assert.equal(decide(ui, api).shouldDeploy, true);
    assert.deepEqual(comparisons, [
      [base, api],
      [api, ui],
      [base, ui],
    ]);
    runDeploymentStep("Invalidate API deployment baseline", fixture, ui);
    runDeploymentStep("Record successful API deployment", fixture, ui);
    assert.equal(decide(ui, api).shouldDeploy, false);
    // API 변경 B가 이미 성공 배포되었다면 UI 변경 C만으로는 재배포하지 않는다.
    runDeploymentStep("Record successful API deployment", fixture, api);
    assert.equal(decide(ui, api).shouldDeploy, false);
    // 성공 기록이 현재 커밋이어도 push 범위의 API 변경은 배포한다.
    assert.equal(decide(api).shouldDeploy, true);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("배포 실패·실행 중 취소 후에는 UI push와 원복도 다시 배포한다", () => {
  const fixture = mkdtempSync(join(root, "output/vscoke-deploy-failure-"));
  const sha = "a".repeat(40);
  try {
    runDeploymentStep("Record successful API deployment", fixture, sha);
    runDeploymentStep("Invalidate API deployment baseline", fixture, "b".repeat(40));
    assert.equal(existsSync(join(fixture, ".last-successful-deploy")), false);
    // health 검사 전에 실패하면 성공 기록 단계는 실행되지 않는다.
    for (const after of ["c".repeat(40), sha]) {
      assert.equal(
        getApiDeployment({ deployDir: fixture, before: sha, after, eventName: "push" })
          .shouldDeploy,
        true,
      );
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("수동 복구로 실제 current와 성공 기록이 다르면 UI 변경도 재배포한다", () => {
  const fixture = mkdtempSync(join(root, "output/vscoke-deploy-rollback-"));
  const sha = "a".repeat(40);
  try {
    writeFileSync(join(fixture, ".last-successful-deploy"), `${sha}\n`);
    const decide = () =>
      getApiDeployment({
        deployDir: fixture,
        before: sha,
        after: sha,
        eventName: "push",
        git: () => "",
      });
    assert.equal(decide().shouldDeploy, true, "현재 릴리스를 확인할 수 없으면 재배포");
    mkdirSync(join(fixture, "current"));
    writeFileSync(join(fixture, "current/revision"), `${"b".repeat(40)}\n`);
    assert.equal(decide().shouldDeploy, true, "수동 복구 이후에는 성공 기록만 신뢰하지 않음");
    writeFileSync(join(fixture, "current/revision"), `${sha}\n`);
    assert.equal(decide().shouldDeploy, false, "실제 릴리스와 기록이 같을 때만 UI 배포 생략");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("성공 커밋은 직렬 배포의 health 검사 뒤에만 기록하고 release 동기화로 삭제하지 않는다", () => {
  assert.match(workflow, /group: deploy-api-host\n  cancel-in-progress: false/);
  const steps = workflow.split("      - name: ").slice(1);
  const index = (name: string) => steps.findIndex(step => step.startsWith(`${name}\n`));
  assert.ok(
    index("Invalidate API deployment baseline") > index("Verify self-hosted runner prerequisites"),
  );
  assert.ok(index("Invalidate API deployment baseline") < index("Build API native release"));
  assert.ok(index("Record successful API deployment") > index("Deploy API native release"));
  assert.doesNotMatch(steps[index("Record successful API deployment")], /always\(\)|failure\(\)/);
  assert.doesNotMatch(
    readFileSync(join(root, "scripts/deploy-api-native.sh"), "utf8"),
    /rsync|--delete/,
  );
});
