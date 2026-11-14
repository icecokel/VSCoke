import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
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
const write = (path: string, content: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

test("운영 환경은 Secret으로 교체되고 비밀값과 셸 문자를 그대로 자식 프로세스에 전달한다", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "vscoke-env-contract-"));
  const target = join(fixture, "api.env");
  const postgresTarget = join(fixture, "postgres.env");
  const composeTarget = join(fixture, ".env");
  const script = join(root, "scripts/api-deploy-env.mjs");
  const password = "fixture 'password' $HOME $(touch unexpected) `touch unexpected`";
  const content = [
    "NODE_ENV=production",
    "DB_SYNCHRONIZE=false",
    "DB_HOST=localhost",
    "DB_USERNAME=fixture",
    `DB_PASSWORD="${password}"`,
    "DB_DATABASE=fixture",
    "GOOGLE_CLIENT_ID=fixture",
    "JEV_API_KEY=fixture-jev-key",
    "ANTHROPIC_API_KEY=fixture-claude-key",
  ].join("\n");
  const env = {
    ...process.env,
    GITHUB_ACTIONS: "false",
    API_DEPLOY_DIR: fixture,
    API_ENV_PRODUCTION: content,
  };
  try {
    write(target, "old-server-env");
    write(postgresTarget, "old-postgres-env");
    write(composeTarget, "old-compose-env");
    await run(process.execPath, [script, "check"], { env });
    for (const invalid of [
      "",
      content.replace("NODE_ENV=production", "NODE_ENV=development"),
      content.replace("DB_SYNCHRONIZE=false", "DB_SYNCHRONIZE=true"),
      content.replace("DB_PASSWORD=", "MISSING_PASSWORD="),
      `${content}\nENABLE_DEV_AUTH_BYPASS=true`,
      `${content}\nDEV_AUTH_TOKEN=fixture-dev-token`,
      content.replace("DB_DATABASE=fixture", 'DB_DATABASE="fix\nture"'),
    ]) {
      await assert.rejects(
        run(process.execPath, [script, "write"], {
          env: { ...env, API_ENV_PRODUCTION: invalid },
        }),
      );
      assert.equal(readFileSync(target, "utf8"), "old-server-env");
      assert.equal(readFileSync(postgresTarget, "utf8"), "old-postgres-env");
      assert.equal(readFileSync(composeTarget, "utf8"), "old-compose-env");
    }
    const applied = await run(process.execPath, [script, "write"], { env });
    assert.equal(applied.stdout, "");
    assert.equal(readFileSync(target, "utf8"), content);
    assert.equal(statSync(target).mode & 0o777, 0o600);
    // compose raw env_file은 따옴표를 벗기지 않으므로 값을 그대로 한 줄씩 쓴다.
    assert.equal(
      readFileSync(postgresTarget, "utf8"),
      `POSTGRES_USER=fixture\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=fixture\n`,
    );
    assert.equal(statSync(postgresTarget).mode & 0o777, 0o600);
    // compose는 비밀값이 아닌 PORT만 보간한다. Secret에 PORT가 없으면 3000이다.
    assert.equal(readFileSync(composeTarget, "utf8"), "PORT=3000\n");
    // 컨테이너는 api.env를 /app/.env로 mount해 읽으므로 같은 배치를 재현한다.
    const app = join(fixture, "app");
    write(join(app, ".env"), readFileSync(target, "utf8"));
    const child = await run(
      process.execPath,
      [
        script,
        "run",
        process.execPath,
        "-e",
        `
      const assert = require("node:assert/strict");
      assert.equal(process.env.DB_PASSWORD, ${JSON.stringify(password)});
      assert.equal(process.env.JEV_API_KEY, "fixture-jev-key");
      assert.equal(process.env.ANTHROPIC_API_KEY, "fixture-claude-key");
      assert.equal(process.env.API_ENV_PRODUCTION, undefined);
      console.log("passed");
    `,
      ],
      { cwd: app, env: { ...env, DB_PASSWORD: "stale-runner-password" } },
    );
    assert.equal(child.stdout.trim(), "passed");
    assert.equal(existsSync(join(app, "unexpected")), false);
    assert.doesNotMatch(workflow, /\. \.\/\.env/);
    assert.match(workflow, /API_ENV_PRODUCTION: \$\{\{ secrets\.API_ENV_PRODUCTION \}\}/);
    assert.match(workflow, /runs-on: \[self-hosted, Linux, ARM64, vscoke-api, oci-01\]/);
    assert.ok(
      workflow.indexOf("Validate production environment secret") <
        workflow.indexOf("Build API native release"),
    );
    assert.match(workflow, /bash scripts\/deploy-api-native\.sh/);
  } finally {
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

test("현재 문서의 API 목록·참조 링크가 구현과 맞는다", () => {
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
  assert.equal(count, 40);
  assert.ok(
    read("docs/local-development.md").includes("./main-chat-ai-usage-guide.md#로컬-api-연결"),
  );
  assert.ok(read("docs/main-chat-ai-usage-guide.md").includes("### 로컬 API 연결"));
});

test("통합 러너는 안전한 test migration과 실제 합성 이력서 등록을 브라우저 전에 완료한다", () => {
  const scripts = JSON.parse(read("apps/api/package.json")) as { scripts: Record<string, string> };
  assert.match(scripts.scripts["migration:run:test"], /test\/support\/migrate-test-database\.ts/);
  assert.doesNotMatch(scripts.scripts["migration:run:test"], /typeorm .*migration:run/);
  const migration = read("apps/api/test/support/migrate-test-database.ts");
  assert.ok(
    migration.indexOf("await dataSource.initialize()") <
      migration.indexOf("useSyntheticResumeMigration(dataSource)"),
  );
  assert.ok(
    migration.indexOf("useSyntheticResumeMigration(dataSource)") <
      migration.indexOf("await dataSource.runMigrations()"),
  );
  const runner = read("apps/web/scripts/playwright-integration-runner.mjs");
  assert.match(runner, /databaseName\.endsWith\("_test"\)/);
  assert.match(runner, /e2e:seed:hobby/);
  assert.match(runner, /CAREER_DATA_WRITE_KEY: careerWriteKey/);
  assert.match(runner, /delete playwrightEnv\.CAREER_DATA_WRITE_KEY/);
  assert.ok(runner.indexOf("await waitForApi()") < runner.indexOf("await seedSyntheticResumes("));
  assert.ok(
    runner.indexOf("await seedSyntheticResumes(") <
      runner.lastIndexOf('"scripts/playwright-runner.mjs"'),
  );
  assert.match(runner, /finally \{\s*stopProcessGroup\(apiProcess\)/);
});
