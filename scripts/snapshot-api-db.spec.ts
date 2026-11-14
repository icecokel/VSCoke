import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");
mkdirSync(join(root, "output/cutover"), { recursive: true });
for (const scenario of ["running-source", "outside-output"]) {
  test(`최종 DB snapshot은 ${scenario} 입력에서 덤프 전에 중단된다`, () => {
    const fixture = mkdtempSync(join(root, "output/cutover/snapshot-test-"));
    try {
      const commands = join(fixture, "commands");
      const unexpected = join(fixture, "unexpected");
      mkdirSync(commands);
      writeFileSync(
        join(commands, "docker"),
        '#!/bin/sh\nif [ "$3" = "{{.State.Running}}" ]; then echo true; else touch "$SNAPSHOT_EXTRA_CALL"; exit 1; fi\n',
        { mode: 0o700 },
      );
      const destination =
        scenario === "outside-output"
          ? join(root, "snapshot-must-not-exist")
          : join(fixture, "snapshot");
      const result = spawnSync("python3", [join(root, "scripts/snapshot-api-db.py"), destination], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${commands}:${process.env.PATH}`,
          SNAPSHOT_EXTRA_CALL: unexpected,
        },
      });
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(destination), false);
      assert.equal(existsSync(unexpected), false);
      assert.match(result.stderr, scenario === "outside-output" ? /output\/cutover/ : /쓰기.*중단/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
