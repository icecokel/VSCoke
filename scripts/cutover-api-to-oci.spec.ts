import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const source = readFileSync(resolve(import.meta.dirname, "cutover-api-to-oci.py"), "utf8");
const mac = {
  success: true,
  data: { status: "ok", timestamp: "2026-11-14T10:00:00Z", uptime: 3600 },
};
const oci = {
  success: true,
  data: { status: "ok", timestamp: "2026-11-14T10:00:30Z", uptime: 30 },
};

for (const scenario of ["before-dns", "after-dns", "success", "prior-cutover", "wrong-origin"]) {
  test(`최종 전환 ${scenario}: 원본 재개와 DNS 이후 중지 정책을 확인한다`, async () => {
    const fixture = mkdtempSync(join(tmpdir(), "vscoke-cutover-"));
    const commands = join(fixture, "commands");
    const calls = join(fixture, "calls");
    const running = join(fixture, "running");
    const routed = join(fixture, "routed");
    const server = createServer((request, response) => {
      response.setHeader("Content-Type", "application/json");
      const payload =
        request.url === "/source-health"
          ? mac
          : scenario === "wrong-origin" || existsSync(routed)
            ? oci
            : mac;
      response.end(JSON.stringify(payload));
    });
    try {
      mkdirSync(commands);
      mkdirSync(join(fixture, "scripts"));
      writeFileSync(running, "true");
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const base = `http://127.0.0.1:${address.port}`;
      const script = join(fixture, "scripts/cutover-api-to-oci.py");
      writeFileSync(
        script,
        source
          .replace('PUBLIC = "https://api.icecoke.kr"', `PUBLIC = "${base}"`)
          .replace(
            'SOURCE_HEALTH = "http://127.0.0.1:3000/health"',
            `SOURCE_HEALTH = "${base}/source-health"`,
          ),
      );
      writeFileSync(
        join(fixture, "scripts/snapshot-api-db.py"),
        `
import json, os, sys
from pathlib import Path
if os.environ['CUTOVER_SCENARIO'] == 'before-dns':
    raise SystemExit('fixture snapshot failure')
destination = Path(sys.argv[1]); destination.mkdir()
metadata = {'source_frozen': True, 'snapshot_matched': True, 'tables': 1, 'indexes': 1, 'sequences': 1, 'migrations': 1, 'vector_rows': 5}
(destination / 'verified.json').write_text(json.dumps(metadata))
for name in ['database.dump', 'database.sha256', 'manifest.txt', 'api-db-manifest.sql']:
    (destination / name).write_text('fixture')
`,
      );
      writeFileSync(join(fixture, "scripts/restore-api-db-oci.py"), "fixture");
      if (scenario === "prior-cutover") {
        const prior = join(fixture, "output/cutover/final-prior");
        mkdirSync(prior, { recursive: true });
        writeFileSync(join(prior, "state.json"), JSON.stringify({ phase: "cutover_complete" }));
      }
      for (const name of ["docker", "cloudflared", "ssh", "scp"]) {
        writeFileSync(
          join(commands, name),
          `#!/usr/bin/env node
          const fs = require("node:fs");
          const args = process.argv.slice(2);
          fs.appendFileSync(process.env.CUTOVER_CALLS, JSON.stringify([${JSON.stringify(name)}, ...args]) + "\\n");
          if (${JSON.stringify(name)} === "docker") {
            if (args[0] === "inspect") console.log(fs.readFileSync(process.env.CUTOVER_RUNNING, "utf8"));
            if (args[0] === "stop") fs.writeFileSync(process.env.CUTOVER_RUNNING, "false");
            if (args[0] === "start") fs.writeFileSync(process.env.CUTOVER_RUNNING, "true");
          }
          if (${JSON.stringify(name)} === "cloudflared") {
            if (args.includes("list")) console.log(JSON.stringify([{id:"cc5f9f8e-fe12-436b-b243-be03466df18c",connections:[{}]}]));
            if (args.includes("dns")) {
              fs.writeFileSync(process.env.CUTOVER_ROUTED, "true");
              if (process.env.CUTOVER_SCENARIO === "after-dns") process.exitCode = 1;
            }
          }
          if (${JSON.stringify(name)} === "ssh") {
            const command = args.at(-1);
            if (command.includes("restored-verified.json")) console.log(JSON.stringify({content_hashes_matched:true,tables:1,indexes:1,sequences:1,migrations:1,vector_rows:5}));
            if (command === "curl -fsS http://127.0.0.1:3000/health") console.log(${JSON.stringify(JSON.stringify(oci))});
          }
        `,
          { mode: 0o700 },
        );
      }
      const operation = run("python3", [script], {
        timeout: 20_000,
        env: {
          ...process.env,
          PATH: `${commands}:${process.env.PATH}`,
          CUTOVER_CALLS: calls,
          CUTOVER_RUNNING: running,
          CUTOVER_ROUTED: routed,
          CUTOVER_SCENARIO: scenario,
        },
      });
      if (scenario === "success") await operation;
      else await assert.rejects(operation);
      const records = existsSync(calls)
        ? readFileSync(calls, "utf8")
            .trim()
            .split("\n")
            .map(line => JSON.parse(line) as string[])
        : [];
      const starts = records.filter(args => args[0] === "docker" && args[1] === "start").length;
      const directory = join(fixture, "output/cutover");
      const journal = readdirSync(directory).find(
        name => name.startsWith("final-") && name !== "final-prior",
      );
      const phase = journal
        ? JSON.parse(readFileSync(join(directory, journal, "state.json"), "utf8")).phase
        : undefined;
      if (scenario === "before-dns") {
        assert.equal(starts, 1);
        assert.equal(readFileSync(running, "utf8"), "true");
        assert.equal(existsSync(routed), false);
        assert.equal(phase, "failed_before_dns_mac_resumed");
      } else if (["after-dns", "success"].includes(scenario)) {
        assert.equal(starts, 0);
        assert.equal(readFileSync(running, "utf8"), "false");
        assert.equal(existsSync(routed), true);
        assert.equal(
          phase,
          scenario === "success" ? "cutover_complete" : "failed_after_dns_request_mac_stopped",
        );
      } else {
        assert.equal(starts, 0);
        assert.equal(
          records.some(args => args[0] === "docker" && args[1] === "stop"),
          false,
        );
        assert.equal(existsSync(routed), false);
      }
    } finally {
      if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
