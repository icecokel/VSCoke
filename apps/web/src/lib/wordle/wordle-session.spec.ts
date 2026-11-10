import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWordleSession } from "./wordle-session";

const session = { answer: "CRANE", guesses: ["SLATE"], currentGuess: "ro", startedAt: 1000 };

test("Wordle 진행 중인 판의 정답·제출 단어·입력 중 글자를 복원한다", () => {
  assert.deepEqual(parseWordleSession(JSON.stringify(session), 5, 6), session);
  assert.deepEqual(
    parseWordleSession(
      JSON.stringify({ ...session, guesses: [], currentGuess: "", startedAt: null }),
      5,
      6,
    ),
    { ...session, guesses: [], currentGuess: "", startedAt: null },
  );
});

test("Wordle 파손되거나 규칙에 맞지 않는 저장값은 복원하지 않는다", () => {
  const invalid = [
    null,
    "{",
    "[]",
    "null",
    ...[
      { ...session, answer: "crane" },
      { ...session, answer: "CRANES" },
      { ...session, guesses: ["SLAT"] },
      { ...session, guesses: Array(7).fill("SLATE") },
      { ...session, currentGuess: "ROUTES" },
      { ...session, currentGuess: "R1" },
      { ...session, startedAt: "1000" },
    ].map(value => JSON.stringify(value)),
  ];
  for (const raw of invalid) assert.equal(parseWordleSession(raw, 5, 6), null);
});
