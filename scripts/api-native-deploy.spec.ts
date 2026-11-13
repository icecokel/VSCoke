import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const repo = resolve(import.meta.dirname, "..");
const write = (path: string, value: string, mode = 0o600): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, { mode });
};
const source = [
  "NODE_ENV=production",
  "DB_SYNCHRONIZE=false",
  "DB_HOST=postgres",
  "DB_USERNAME=old",
  "DB_DATABASE=old",
  "DB_PASSWORD=synthetic-old-password",
  "GOOGLE_CLIENT_ID=synthetic-google-id",
  "ANTHROPIC_API_KEY=synthetic-api-key",
  "RAG_RETRIEVAL_MODE=hybrid",
  "RAG_EMBEDDING_PROVIDER=local-e5-q8",
].join("\n");

// 실제 배포 셸·환경 변환·HTTP health를 실행하고 systemd·DB 작업만 합성 경계로 바꾼다.
for (const scenario of [
  "success",
  "keyword",
  "migration",
  "import",
  "index",
  "restart",
  "health",
  "public",
  "secret",
]) {
  test(`네이티브 배포 ${scenario}: 공유 상태 보존과 실패 복구`, async () => {
    const fixture = mkdtempSync(join(tmpdir(), "vscoke-native-deploy-"));
    const root = join(fixture, "live");
    const bundle = join(fixture, "bundle");
    const previous = join(root, "releases/previous");
    const commands = join(fixture, "commands");
    const calls = join(fixture, "calls");
    const revision = "a".repeat(40);
    const release = join(root, `releases/${revision}-1-1`);
    const oldEnv = `${source}\nOLD_ENV=preserved\n`;
    const preserved = [
      ".local/db.env",
      ".cache/embeddings/model.bin",
      "logs/combined.log",
      "backups/database.dump",
    ];
    const server = createServer((request, response) => {
      const promoted = realpathSync(join(root, "current")) === release;
      if (promoted && scenario === "health") response.statusCode = 503;
      if (request.url === "/public" && scenario === "public") response.statusCode = 503;
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          success: true,
          data: { status: "ok", uptime: 1, timestamp: new Date().toISOString() },
        }),
      );
    });
    try {
      write(join(root, "api.env"), oldEnv);
      write(join(root, ".local/activate"), "");
      write(
        join(root, ".local/db.env"),
        `DB_HOST=127.0.0.1\nDB_PORT=5432\nDB_USERNAME=vscoke_api\nDB_DATABASE=vscoke_api\nDB_PASSWORD=${"b".repeat(64)}\n`,
      );
      for (const path of preserved.slice(1)) write(join(root, path), `preserve:${path}`);
      const contents = preserved.map(path => readFileSync(join(root, path), "utf8"));
      mkdirSync(join(previous, "bin"), { recursive: true });
      symlinkSync(process.execPath, join(previous, "bin/node"));
      mkdirSync(join(previous, "scripts"));
      mkdirSync(join(bundle, "scripts"), { recursive: true });
      mkdirSync(join(bundle, "bin"));
      symlinkSync(process.execPath, join(bundle, "bin/node"));
      for (const script of [
        "api-deploy-env.mjs",
        "check-api-health.mjs",
        "api-health-checker.mjs",
      ]) {
        for (const target of [previous, bundle])
          copyFileSync(join(repo, "scripts", script), join(target, "scripts", script));
      }
      write(join(bundle, "apps/api/dist/src/main.js"), "");
      write(
        join(bundle, "apps/api/dist/src/data-source.js"),
        `module.exports.default = {
        initialize: async () => {}, destroy: async () => {}, showMigrations: async () => ${scenario === "migration"}
      };`,
      );
      for (const [script, phase] of [
        ["import-resume-source-items", "import"],
        ["index-resume-vectors", "index"],
      ]) {
        write(
          join(bundle, `apps/api/dist/scripts/${script}.js`),
          `
          require("node:fs").appendFileSync(process.env.FIXTURE_CALLS, "${phase}\\n");
          require("node:assert/strict").equal(process.env.API_ENV_PRODUCTION, undefined);
          ${phase === "import" ? 'require("node:assert/strict").equal(process.env.RESUME_WORKSPACE_ROOT, "");' : ""}
          process.exitCode = ${scenario === phase ? 1 : 0};
        `,
        );
      }
      symlinkSync(previous, join(root, "current"));
      // macOS에서도 셸 경로를 실행한다. Linux의 flock 자체는 대상 호스트에서 별도 검증한다.
      write(join(commands, "flock"), "#!/bin/sh\nexit 0\n", 0o700);
      write(
        join(commands, "sudo"),
        `#!/bin/sh
        echo restart >> "$FIXTURE_CALLS"
        if [ "$FIXTURE_SCENARIO" = restart ] && [ ! -f "$FIXTURE_CALLS.failed" ]; then
          touch "$FIXTURE_CALLS.failed"
          exit 1
        fi
      `,
        0o700,
      );
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const env = {
        ...process.env,
        PATH: `${commands}:${dirname(process.execPath)}:${process.env.PATH}`,
        GITHUB_ACTIONS: "false",
        GITHUB_SHA: revision,
        GITHUB_RUN_ID: "1",
        GITHUB_RUN_ATTEMPT: "1",
        API_DEPLOY_DIR: root,
        API_ENV_PRODUCTION:
          scenario === "secret"
            ? ""
            : source.replace("hybrid", scenario === "keyword" ? "keyword" : "hybrid"),
        API_LOCAL_HEALTH_URL: `http://127.0.0.1:${address.port}/health`,
        API_HEALTH_URL: `http://127.0.0.1:${address.port}/public`,
        API_VERIFY_PUBLIC: scenario === "public" ? "true" : "false",
        API_HEALTH_RETRIES: "1",
        API_HEALTH_RETRY_DELAY_MS: "1",
        FIXTURE_CALLS: calls,
        FIXTURE_SCENARIO: scenario,
      };
      const operation = run("bash", [join(repo, "scripts/deploy-api-native.sh"), bundle], {
        env,
        timeout: 20_000,
      });
      if (["success", "keyword"].includes(scenario)) {
        const result = await operation;
        assert.doesNotMatch(
          result.stdout + result.stderr,
          /synthetic-api-key|synthetic-old-password|bbbbbbbbbbbbbbbb/,
        );
        assert.equal(realpathSync(join(root, "current")), release);
        assert.equal(realpathSync(join(release, ".env")), join(root, "api.env"));
        assert.equal(realpathSync(join(release, "logs")), join(root, "logs"));
        assert.match(
          readFileSync(calls, "utf8"),
          scenario === "keyword" ? /^import\nrestart\n$/ : /^import\nindex\nrestart\n$/,
        );
        assert.equal(statSync(join(root, "api.env")).mode & 0o777, 0o600);
      } else {
        await assert.rejects(operation, error => {
          const failure = error as Error & { stdout: string; stderr: string };
          assert.match(failure.stderr, /이전 릴리스와 환경을 보존\/복구/);
          assert.doesNotMatch(
            failure.stdout + failure.stderr,
            /synthetic-api-key|synthetic-old-password|bbbbbbbbbbbbbbbb/,
          );
          return true;
        });
        assert.equal(realpathSync(join(root, "current")), previous);
        assert.equal(readFileSync(join(root, "api.env"), "utf8"), oldEnv);
        if (["restart", "health", "public"].includes(scenario)) {
          assert.equal(readFileSync(calls, "utf8").match(/restart/g)?.length, 2);
        }
        if (scenario === "migration") assert.equal(existsSync(calls), false);
      }
      for (const [index, path] of preserved.entries())
        assert.equal(readFileSync(join(root, path), "utf8"), contents[index]);
      assert.equal(
        readFileSync(join(root, `.local/deploy-${revision}-1-1/api.env`), "utf8"),
        oldEnv,
      );
      assert.equal(existsSync(join(root, ".last-successful-deploy")), false);
    } finally {
      if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
