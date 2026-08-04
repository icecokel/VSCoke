import assert from "node:assert/strict";
import test from "node:test";

import { resolveNurseHealingPresentationFrame } from "./nurse-healing-presentation";

test("회복 연출은 충전, 전달, 회복, 안정화 순서로 진행한다", () => {
  assert.equal(resolveNurseHealingPresentationFrame(0.1).stage, "charge");
  assert.equal(resolveNurseHealingPresentationFrame(0.4).stage, "transfer");
  assert.equal(resolveNurseHealingPresentationFrame(0.74).stage, "restore");
  assert.equal(resolveNurseHealingPresentationFrame(0.96).stage, "settle");
});

test("회복 신호는 전달 중 연결선을 만들고 회복 중 플레이어 오라를 확장한다", () => {
  const transfer = resolveNurseHealingPresentationFrame(0.42);
  const restore = resolveNurseHealingPresentationFrame(0.78);

  assert.ok(transfer.linkAlpha > 0);
  assert.ok(transfer.transferProgress > 0 && transfer.transferProgress < 1);
  assert.ok(restore.playerAuraAlpha > 0);
  assert.ok(restore.shardDistance > 0);
});
