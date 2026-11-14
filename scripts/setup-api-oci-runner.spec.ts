import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "setup-api-oci-runner.sh"), "utf8");

for (const scenario of ["checksum", "existing-runner"]) {
  test(`OCI runner 설치 ${scenario} 거절은 관리자 실행 전에 중단된다`, () => {
    const fixture = mkdtempSync(join(tmpdir(), "vscoke-runner-setup-"));
    const runner = join(fixture, "runner");
    const commands = join(fixture, "commands");
    const privileged = join(fixture, "privileged");
    try {
      mkdirSync(runner);
      mkdirSync(commands);
      const script = join(fixture, "setup.sh");
      writeFileSync(script, source.replaceAll("/home/ubuntu/actions-runner-vscoke-api", runner));
      const command = (name: string, content: string): void => {
        writeFileSync(join(commands, name), `#!/bin/sh\n${content}\n`, { mode: 0o700 });
      };
      command("uname", 'if [ "$1" = -s ]; then echo Linux; else echo aarch64; fi');
      command("id", "echo ubuntu");
      command("curl", "exit 0");
      command("sha256sum", "exit 1");
      command("sudo", 'touch "$SETUP_PRIVILEGED_MARKER"; exit 1');
      if (scenario === "existing-runner") {
        writeFileSync(
          join(runner, ".runner"),
          JSON.stringify({
            gitHubUrl: "https://github.com/icecokel/discord-bot",
            agentName: "discord-bot-oci",
          }),
        );
      }
      const result = spawnSync("bash", [script], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${commands}:${process.env.PATH}`,
          SETUP_PRIVILEGED_MARKER: privileged,
        },
      });
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(privileged), false);
      if (scenario === "existing-runner") assert.match(result.stderr, /다른 러너/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
