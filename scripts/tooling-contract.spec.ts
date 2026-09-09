import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const run = promisify(execFile);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const read = (path: string): string => readFileSync(join(root, path), "utf8");
const workflow = read(".github/workflows/deploy-api.yml");
const stepScript = (name: string): string => {
  const section = workflow.split(`      - name: ${name}\n`)[1]?.split("\n      - name:")[0];
  const script = section?.split("        run: |\n")[1];
  assert.ok(script, `배포 단계가 없음: ${name}`);
  return script
    .split("\n")
    .map(line => line.replace(/^ {10}/, ""))
    .join("\n");
};
const write = (path: string, content: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

// 운영 호스트 대신 임시 checkout/release에서 실제 workflow의 두 단계를 실행한다.
test("배포는 로그·환경·백업을 보존하고 릴리스에서 health 검사를 실행할 수 있다", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "vscoke-release-contract-"));
  const checkout = join(fixture, "checkout");
  const live = join(fixture, "live");
  const bin = join(fixture, "bin");
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        success: true,
        data: { status: "ok", uptime: 1, timestamp: new Date().toISOString() },
      }),
    );
  });
  try {
    for (const path of [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "apps/api/package.json",
      "scripts/check-api-health.mjs",
      "scripts/api-health-checker.mjs",
    ]) {
      const target = join(checkout, path);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, path), target);
    }
    write(join(checkout, "apps/api/dist/src/main.js"), "// fixture release\n");
    write(join(checkout, "apps/web/src/constants/resume-data.json"), "[]");
    for (const locale of ["ko-KR", "en-US", "ja-JP"])
      write(join(checkout, `apps/web/messages/${locale}.json`), "{}");
    write(join(checkout, "apps/web/resume-detail/fixture.mdx"), "공개 근거 fixture");
    for (const path of ["public-site-guide.md", "public-resume-experience.md"])
      write(join(checkout, `docs/${path}`), "공개 문서 fixture");
    for (const path of [
      "logs/combined.log",
      "logs/nested/old.log.gz",
      "backups/fixture.dump",
      ".env",
    ])
      write(join(live, path), `preserve:${path}`);
    write(join(live, "obsolete.js"), "remove stale release file");
    write(
      join(bin, "pnpm"),
      '#!/bin/sh\n[ "$*" = "--filter @vscoke/api install --prod --frozen-lockfile --ignore-scripts" ] || exit 77\n',
    );
    chmodSync(join(bin, "pnpm"), 0o700);
    const env = { ...process.env, API_DEPLOY_DIR: live, PATH: `${bin}:${process.env.PATH ?? ""}` };
    for (const name of ["Create staged release", "Promote release"]) {
      await run("bash", ["-eu", "-c", stepScript(name)], { cwd: checkout, env, timeout: 30_000 });
    }
    for (const path of [
      "logs/combined.log",
      "logs/nested/old.log.gz",
      "backups/fixture.dump",
      ".env",
    ]) {
      assert.equal(readFileSync(join(live, path), "utf8"), `preserve:${path}`);
    }
    assert.equal(existsSync(join(live, "obsolete.js")), false);
    assert.ok(existsSync(join(live, "apps/api/dist/src/main.js")));
    for (const path of ["scripts/check-api-health.mjs", "scripts/api-health-checker.mjs"]) {
      assert.equal(readFileSync(join(live, path), "utf8"), read(path));
    }
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const { stdout } = await run(process.execPath, ["scripts/check-api-health.mjs"], {
      cwd: live,
      env: {
        ...process.env,
        API_HEALTH_URL: `http://127.0.0.1:${address.port}/health`,
        API_ENDPOINT_CHECKS: "/health",
        API_REQUIRED_PATHS: "",
        API_HEALTH_RETRIES: "1",
        API_HEALTH_TIMEOUT_MS: "2000",
      },
      timeout: 10_000,
    });
    assert.match(stdout, /API health check passed/);
  } finally {
    if (server.listening)
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve())),
      );
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("문서와 CI의 Playwright 명령은 옵션 종료 구분자를 전달하지 않는다", () => {
  for (const path of [
    ".github/workflows/pull-request-check.yml",
    ".github/workflows/production-chat-smoke.yml",
    "docs/hobby-frontend-schema-concept.md",
  ]) {
    assert.doesNotMatch(read(path), /pnpm[^\n]*\be2e\s+--(?:\s|$)/, path);
  }
});

test("실제 러너에서 WebKit 선택은 Chromium을 실행 목록에 포함하지 않는다", async () => {
  // --list는 브라우저·Next 서버 없이 가능하지만 러너의 준비 URL은 loopback fixture로 충족한다.
  const server = createServer((_request, response) => response.end("ready"));
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const { stdout } = await run(
      pnpm,
      [
        "--filter",
        "@vscoke/web",
        "e2e",
        "tests/e2e/resume-conversation-persistence.spec.ts",
        "--list",
        "--project=webkit",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${address.port}`,
          PLAYWRIGHT_ENABLE_CROSS_BROWSER: "1",
        },
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    assert.match(stdout, /\[webkit\]/);
    assert.doesNotMatch(stdout, /\[chromium(?:-|\])/);
    assert.match(stdout, /resume-conversation-persistence\.spec\.ts/);
  } finally {
    if (server.listening)
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve())),
      );
  }
});

test("문서의 Jest 명령은 실제 직렬 실행 설정으로 해석된다", async () => {
  assert.match(
    read("docs/hobby-api-swagger-concept.md"),
    /pnpm --filter @vscoke\/api exec jest --runInBand/,
  );
  const { stdout } = await run(
    pnpm,
    ["--filter", "@vscoke/api", "exec", "jest", "--runInBand", "--showConfig"],
    { cwd: root, timeout: 30_000 },
  );
  const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
    globalConfig: { runInBand: boolean; testPathPatterns: string[] };
  };
  assert.equal(parsed.globalConfig.runInBand, true);
  assert.deepEqual(parsed.globalConfig.testPathPatterns, []);
});

test("현재 문서의 API 목록·참조 링크·폐기 범위가 구현과 맞는다", () => {
  const api = JSON.parse(read("apps/api/openapi.json")) as {
    paths: Record<string, Record<string, unknown>>;
  };
  const readme = read("apps/api/README.md");
  let count = 0;
  for (const [path, item] of Object.entries(api.paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (!item[method]) continue;
      count += 1;
      const readablePath = path.replace(/\{([^}]+)\}/g, ":$1");
      assert.ok(
        readme.includes(`${method.toUpperCase()} ${readablePath}`),
        `API 개요 누락: ${method} ${path}`,
      );
    }
  }
  assert.equal(count, 16);
  assert.ok(
    read("docs/local-development.md").includes("./main-chat-ai-usage-guide.md#로컬-api-연결"),
  );
  assert.ok(read("docs/main-chat-ai-usage-guide.md").includes("### 로컬 API 연결"));
  const scenarios = read("docs/e2e-full-feature-test-scenarios.md");
  assert.doesNotMatch(scenarios, /^\| `API-0(?:08|09|1[0-7])`[^\n]*\|\s*P[0-2]\/[AN]/m);
  assert.doesNotMatch(scenarios, /^\| `SEC-003`[^\n]*\|\s*P[0-2]\/A/m);
  assert.match(scenarios, /폐기된 ID는 재사용하지 않는다/);
  for (const path of [
    "docs/main-chat-test-scenarios.md",
    "docs/resume-rag-chat-test-scenarios.md",
  ]) {
    const text = read(path);
    assert.doesNotMatch(text, /현재 `question`, `locale`만/);
    assert.match(text, /conversationId/);
    assert.match(text, /X-Resume-Conversation-Token/);
    assert.match(text, /CONV-007/);
  }
});
