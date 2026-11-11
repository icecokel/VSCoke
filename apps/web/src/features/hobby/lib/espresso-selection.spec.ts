import assert from "node:assert/strict";
import test from "node:test";
import { espressoBeans } from "../../../../tests/fixtures/hobby-api";
import { getEspressoSelection } from "./espresso-selection";

const bean = espressoBeans[0];
const firstLog = bean.logs[0];
const secondLog = { ...firstLog, id: "second-log", rounds: [firstLog.rounds[2]] };
const multipleLogsBean = { ...bean, logs: [firstLog, secondLog] };

test("URL이 없으면 첫 로그의 현재 기준 세팅을 선택한다", () => {
  assert.deepEqual(getEspressoSelection(multipleLogsBean, new URLSearchParams()), {
    type: "current",
    beanId: bean.id,
    logId: firstLog.id,
  });
});

test("URL의 로그·라운드·모든 상세 유형을 복원한다", () => {
  const roundId = secondLog.rounds[0].id;
  assert.deepEqual(
    getEspressoSelection(
      multipleLogsBean,
      new URLSearchParams({ log: secondLog.id, round: roundId }),
    ),
    { type: "round", beanId: bean.id, logId: secondLog.id, roundId },
  );
  for (const type of ["current", "next", "guide", "history"]) {
    assert.deepEqual(
      getEspressoSelection(
        multipleLogsBean,
        new URLSearchParams({ log: secondLog.id, detail: type }),
      ),
      { type, beanId: bean.id, logId: secondLog.id },
    );
  }
});

test("삭제·누락·빈 값·중복·서로 충돌하는 선택은 거부한다", () => {
  for (const query of [
    "log=deleted",
    "log=",
    "round=deleted",
    "round=",
    "detail=unknown",
    "detail=",
    `log=${secondLog.id}&round=${firstLog.rounds[0].id}`,
    `round=${firstLog.rounds[0].id}&detail=history`,
    `log=${firstLog.id}&log=${secondLog.id}`,
    `round=${firstLog.rounds[0].id}&round=${firstLog.rounds[1].id}`,
    "detail=guide&detail=history",
  ]) {
    assert.equal(getEspressoSelection(multipleLogsBean, new URLSearchParams(query)), null, query);
  }
});

test("기록 없는 원두에는 선택이 없고 다른 query는 선택에 영향을 주지 않는다", () => {
  assert.equal(getEspressoSelection(espressoBeans[1], new URLSearchParams()), null);
  assert.equal(getEspressoSelection(espressoBeans[1], new URLSearchParams("round=3")), null);
  assert.deepEqual(
    getEspressoSelection(bean, new URLSearchParams("other=keep")),
    getEspressoSelection(bean, new URLSearchParams()),
  );
});
