import assert from "node:assert/strict";
import test from "node:test";
import { getHistoryPath } from "./history-path";

test("레시피 검색과 상세 선택은 같은 탭으로 정규화한다", () => {
  for (const query of ["q=돼지고기", "recipe=recipe-id", "q=돼지고기&recipe=recipe-id"]) {
    assert.equal(getHistoryPath(`/hobby/recipes?${query}#detail`), "/hobby/recipes");
    assert.equal(getHistoryPath(`/hobby/recipes?${query}&other=keep`), "/hobby/recipes?other=keep");
  }
  assert.equal(getHistoryPath("/blog?q=search&recipe=keep"), "/blog?q=search&recipe=keep");
});

test("기본 PE 문서와 해시만 같은 탭으로 정규화한다", () => {
  for (const path of ["/readme", "/resume/project", "/resume/question", "/resume/preview"]) {
    assert.equal(getHistoryPath(`${path}?resume=pe#career_1`), path);
    assert.equal(getHistoryPath(`${path}#career_1`), path);
    assert.equal(getHistoryPath(`${path}?chatId=a%20b&resume=pe`), `${path}?chatId=a+b`);
  }
});

test("명시한 다른 문서와 잘못된 선택, 다른 쿼리는 유지한다", () => {
  for (const query of [
    "resume=fe",
    "resume=nexon",
    "resume=",
    "resume=pe&resume=fe",
    "resume=pe&resume=pe",
    "chatId=chat",
  ]) {
    assert.equal(getHistoryPath(`/readme?${query}#career_1`), `/readme?${query}`);
  }
  assert.equal(getHistoryPath("/game?resume=pe&mode=a#game"), "/game?resume=pe&mode=a");
  assert.equal(getHistoryPath("/readme?chatId=a?b&resume=pe"), "/readme?chatId=a%3Fb");
  assert.equal(getHistoryPath("/readme?resume=pe&chatId=chat"), "/readme?chatId=chat");
  assert.equal(getHistoryPath("/game?query=a%20b"), getHistoryPath("/game?query=a+b"));
});
