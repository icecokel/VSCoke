import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { parseEnv } from "node:util";

const script = join(dirname(fileURLToPath(import.meta.url)), "api-deploy-env.mjs");
const source =
  'DB_HOST=postgres\nDB_USERNAME=original\nDB_DATABASE=original\nDB_PASSWORD="original$secret#value"\nGOOGLE_CLIENT_ID=test.invalid\nNODE_ENV=production\nDB_SYNCHRONIZE=false\nANTHROPIC_API_KEY="synthetic-key"\n';

test("OCI 설정에서만 DB·네트워크·캐시 경로를 교체하고 비밀값을 보존한다", () => {
  const dir = mkdtempSync(join(tmpdir(), "vscoke-native-"));
  try {
    mkdirSync(join(dir, ".local"));
    const password = "a".repeat(64);
    const db = join(dir, ".local/db.env");
    writeFileSync(
      db,
      "DB_HOST=127.0.0.1\nDB_PORT=5432\nDB_USERNAME=vscoke_api\nDB_DATABASE=vscoke_api\nDB_PASSWORD=" +
        password +
        "\nUNRELATED_VALUE=ignored\n",
    );
    const env = {
      ...process.env,
      GITHUB_ACTIONS: "false",
      API_ENV_PRODUCTION: source,
      API_DEPLOY_DIR: dir,
    };
    const result = spawnSync(process.execPath, [script, "write-native"], { env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    const output = join(dir, "api.env");
    const parsed = parseEnv(readFileSync(output, "utf8"));
    assert.equal(parsed.DB_PASSWORD, password);
    assert.equal(parsed.ANTHROPIC_API_KEY, "synthetic-key");
    assert.equal(parsed.API_HOST, "127.0.0.1");
    assert.equal(parsed.DB_HOST, "127.0.0.1");
    assert.equal(parsed.RAG_LOCAL_EMBEDDING_CACHE_DIR, join(dir, ".cache/embeddings"));
    assert.equal(parsed.UNRELATED_VALUE, undefined);
    assert.equal(statSync(output).mode & 0o777, 0o600);
    writeFileSync(db, readFileSync(db, "utf8").replace("127.0.0.1", "public-host.invalid"));
    const failure = spawnSync(process.execPath, [script, "write-native"], {
      env,
      encoding: "utf8",
    });
    assert.notEqual(failure.status, 0);
    assert.equal(parseEnv(readFileSync(output, "utf8")).DB_HOST, "127.0.0.1");
    assert.ok(!failure.stderr.includes(password));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
