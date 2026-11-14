import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const source = readFileSync(resolve(import.meta.dirname, "restore-api-db-oci.py"), "utf8");

for (const scenario of [
  "unfrozen",
  "permission-denied",
  "backup-invalid",
  "manifest-mismatch",
  "success",
]) {
  test(`OCI DB 복원 ${scenario}: 백업·원본 대조·API 기동 순서를 확인한다`, async () => {
    const fixture = mkdtempSync(join(tmpdir(), "vscoke-restore-"));
    const server = createServer((_request, response) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ success: true, data: { status: "ok" } }));
    });
    try {
      const app = join(fixture, "app");
      const stage = join(fixture, "stage");
      const commands = join(fixture, "commands");
      const calls = join(fixture, "calls");
      mkdirSync(join(app, ".local"), { recursive: true });
      mkdirSync(stage);
      mkdirSync(commands);
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const script = join(fixture, "restore.py");
      writeFileSync(
        script,
        source
          .replace('APP = Path("/home/ubuntu/vscoke-api")', `APP = Path(${JSON.stringify(app)})`)
          .replace(
            'STAGE = Path("/home/ubuntu/vscoke-api-rehearsal/cutover")',
            `STAGE = Path(${JSON.stringify(stage)})`,
          )
          .replaceAll("http://127.0.0.1:3000/", `http://127.0.0.1:${address.port}/`),
      );
      const archive = "synthetic snapshot";
      const manifest = "table|fixture|1|fixture-hash";
      writeFileSync(join(stage, "database.dump"), archive);
      writeFileSync(join(stage, "manifest.txt"), manifest + "\n");
      writeFileSync(join(stage, "api-db-manifest.sql"), "SELECT fixture");
      writeFileSync(
        join(stage, "verified.json"),
        JSON.stringify({
          source_frozen: scenario !== "unfrozen",
          snapshot_matched: true,
          dump_sha256: createHash("sha256").update(archive).digest("hex"),
          database: ["UTF8", "en_US.utf8", "en_US.utf8"],
          tables: 1,
          indexes: 1,
          sequences: 1,
          migrations: 1,
          vector_rows: 5,
        }),
      );
      const command = (name: string, content: string): void => {
        writeFileSync(join(commands, name), `#!/bin/sh\n${content}\n`, { mode: 0o700 });
      };
      command("hostname", "echo oci-termux-prod-01");
      command("id", "echo ubuntu");
      command(
        "pg_restore",
        'case "$RESTORE_SCENARIO:$2" in backup-invalid:*/backups/*) exit 1;; esac; exit 0',
      );
      writeFileSync(
        join(commands, "sudo"),
        `#!/usr/bin/env node
        const fs = require("node:fs");
        const args = process.argv.slice(2);
        fs.appendFileSync(process.env.RESTORE_CALLS, JSON.stringify(args) + "\\n");
        if (args[0] !== "-n" || process.env.RESTORE_SCENARIO === "permission-denied") {
          console.error("sudo: a password is required");
          process.exit(1);
        }
        if (args.includes("pg_dump")) process.stdout.write("synthetic prior backup");
        if (args.includes("psql") && args.includes("-XqAt")) {
          process.stdout.write(process.env.RESTORE_SCENARIO === "manifest-mismatch" ? "different" : process.env.RESTORE_MANIFEST);
        }
      `,
        { mode: 0o700 },
      );
      const operation = run("python3", [script], {
        env: {
          ...process.env,
          PATH: `${commands}:${process.env.PATH}`,
          RESTORE_CALLS: calls,
          RESTORE_SCENARIO: scenario,
          RESTORE_MANIFEST: manifest,
        },
        timeout: 20_000,
      });
      if (scenario === "success") {
        const result = await operation;
        assert.equal(JSON.parse(result.stdout).content_hashes_matched, true);
        assert.equal(existsSync(join(stage, "restored-verified.json")), true);
      } else {
        await assert.rejects(operation);
        assert.equal(existsSync(join(stage, "restored-verified.json")), false);
      }
      const commandsCalled = existsSync(calls)
        ? readFileSync(calls, "utf8")
            .trim()
            .split("\n")
            .map(line => JSON.parse(line) as string[])
        : [];
      const has = (name: string): boolean => commandsCalled.some(args => args.includes(name));
      if (scenario === "unfrozen") assert.equal(commandsCalled.length, 0);
      if (scenario === "permission-denied") {
        assert.equal(has("pg_dump"), false);
        assert.equal(has("dropdb"), false);
        assert.deepEqual(commandsCalled, [["-n", "systemctl", "stop", "vscoke-api.service"]]);
      }
      if (scenario === "backup-invalid") {
        assert.equal(has("dropdb"), false);
        assert.deepEqual(commandsCalled.at(-1), ["-n", "systemctl", "start", "vscoke-api.service"]);
      }
      if (scenario === "manifest-mismatch") {
        assert.equal(has("dropdb"), true);
        assert.equal(has("start"), false);
        assert.deepEqual(commandsCalled.at(-1), ["-n", "systemctl", "stop", "vscoke-api.service"]);
      }
      if (scenario === "success") {
        assert.ok(
          commandsCalled.findIndex(args => args.includes("pg_dump")) <
            commandsCalled.findIndex(args => args.includes("dropdb")),
        );
        assert.ok(
          commandsCalled.findIndex(args => args.includes("pg_restore")) <
            commandsCalled.findIndex(args => args.includes("start")),
        );
      }
    } finally {
      if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
