import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "prepare-api-oci-cutover.sh"), "utf8");
for (const scenario of ["credentials", "checksum", "locale-cache", "probe-denied"]) {
  test(`OCI 전환 준비 ${scenario}: 실패 차단 또는 로케일 재검증을 확인한다`, () => {
    const fixture = mkdtempSync(join(tmpdir(), "vscoke-cutover-prepare-"));
    try {
      const app = join(fixture, "app");
      const stage = join(fixture, "stage");
      const commands = join(fixture, "commands");
      const privileged = join(fixture, "privileged");
      mkdirSync(join(app, "current"), { recursive: true });
      mkdirSync(join(app, ".local"));
      mkdirSync(stage);
      mkdirSync(commands);
      writeFileSync(join(app, "current/revision"), "fixture");
      writeFileSync(
        join(stage, "oci-tunnel-credentials.json"),
        JSON.stringify({
          TunnelID: scenario === "credentials" ? "wrong" : "cc5f9f8e-fe12-436b-b243-be03466df18c",
          TunnelSecret: Buffer.alloc(32).toString("base64"),
          AccountTag: "a".repeat(32),
        }),
      );
      const script = join(fixture, "prepare.sh");
      writeFileSync(
        script,
        source
          .replaceAll("/home/ubuntu/vscoke-api-rehearsal/cutover", stage)
          .replaceAll("/home/ubuntu/vscoke-api", app)
          .replaceAll("/usr/bin/cloudflared", join(commands, "cloudflared")),
      );
      const command = (name: string, content: string): void => {
        writeFileSync(join(commands, name), `#!/bin/sh\n${content}\n`, { mode: 0o700 });
      };
      command("uname", "echo aarch64");
      command("id", "echo ubuntu");
      command("hostname", "echo oci-termux-prod-01");
      command("curl", "exit 0");
      const completesValidation = ["locale-cache", "probe-denied"].includes(scenario);
      command("sha256sum", completesValidation ? "exit 0" : "exit 1");
      command("cloudflared", "echo 'cloudflared version 2026.11.0'");
      command("locale", "echo en_US.utf8");
      command("locale-gen", "exit 0");
      command("systemd-analyze", "exit 0");
      command("systemctl", "echo active");
      if (completesValidation) {
        writeFileSync(
          join(commands, "sudo"),
          `#!/usr/bin/env node
          const fs = require("node:fs");
          const args = process.argv.slice(2);
          const calls = process.env.CUTOVER_PRIVILEGED_MARKER;
          fs.appendFileSync(calls, JSON.stringify(args) + "\\n");
          if (args[0] !== "-n") {
            console.error("sudo: interactive authentication is not allowed in this fixture");
            process.exit(1);
          }
          if (args.includes("createdb") && !fs.existsSync(calls + ".failed")) {
            fs.writeFileSync(calls + ".failed", "once");
            console.error(process.env.CUTOVER_SCENARIO === "probe-denied" ? "createdb: permission denied" : 'createdb: invalid LC_COLLATE locale name: "en_US.utf8"');
            process.exitCode = 1;
          }
        `,
          { mode: 0o700 },
        );
      } else {
        command("sudo", 'touch "$CUTOVER_PRIVILEGED_MARKER"; exit 1');
      }
      const result = spawnSync("bash", [script], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${commands}:${process.env.PATH}`,
          CUTOVER_PRIVILEGED_MARKER: privileged,
          CUTOVER_SCENARIO: scenario,
        },
      });
      if (scenario === "locale-cache") {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const calls = readFileSync(privileged, "utf8")
          .trim()
          .split("\n")
          .map(line => {
            const args = JSON.parse(line) as string[];
            assert.equal(args[0], "-n");
            return args.slice(1);
          });
        const firstProbe = calls.findIndex(args => args.includes("createdb"));
        const restart = calls.findIndex(args => args[0] === "systemctl" && args[1] === "restart");
        const startApi = calls.findIndex(args => args[0] === "systemctl" && args[1] === "start");
        const secondProbe = calls.findLastIndex(args => args.includes("createdb"));
        assert.ok(firstProbe < restart && restart < startApi && startApi < secondProbe);
        assert.equal(calls.filter(args => args.includes("restart")).length, 1);
        assert.equal(
          calls.some(args => args.includes("locale-gen")),
          false,
        );
        assert.equal(existsSync(join(app, ".local/cloudflared-credentials.json")), true);
      } else {
        assert.notEqual(result.status, 0);
        assert.equal(existsSync(join(app, ".local/cloudflared-credentials.json")), false);
        if (scenario === "probe-denied") {
          assert.doesNotMatch(readFileSync(privileged, "utf8"), /restart/);
          assert.match(result.stderr, /permission denied/);
        } else {
          assert.equal(existsSync(privileged), false);
        }
      }
      if (scenario === "credentials") assert.match(result.stderr, /자격 증명 검증 실패/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
