import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "prepare-api-oci-cutover.sh"), "utf8");
for (const scenario of ["credentials", "checksum"]) {
  test(`OCI 전환 준비의 ${scenario} 오류는 관리자 실행 전에 중단된다`, () => {
    const fixture = mkdtempSync(join(tmpdir(), "vscoke-cutover-prepare-"));
    try {
      const app = join(fixture, "app");
      const stage = join(fixture, "stage");
      const commands = join(fixture, "commands");
      const privileged = join(fixture, "privileged");
      mkdirSync(join(app, "current"), { recursive: true });
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
          .replaceAll("/home/ubuntu/vscoke-api", app),
      );
      const command = (name: string, content: string): void => {
        writeFileSync(join(commands, name), `#!/bin/sh\n${content}\n`, { mode: 0o700 });
      };
      command("uname", "echo aarch64");
      command("id", "echo ubuntu");
      command("hostname", "echo oci-termux-prod-01");
      command("curl", "exit 0");
      command("sha256sum", "exit 1");
      command("sudo", 'touch "$CUTOVER_PRIVILEGED_MARKER"; exit 1');
      const result = spawnSync("bash", [script], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${commands}:${process.env.PATH}`,
          CUTOVER_PRIVILEGED_MARKER: privileged,
        },
      });
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(privileged), false);
      assert.equal(existsSync(join(app, ".local/cloudflared-credentials.json")), false);
      if (scenario === "credentials") assert.match(result.stderr, /자격 증명 검증 실패/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
