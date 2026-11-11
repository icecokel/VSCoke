import assert from "node:assert/strict";
import test from "node:test";
import { getHistoryPath, getHistoryTabKey, parseHistoryUrl } from "./history-path";

test("이력 URL은 내부 경로만 파싱하고 손상된 값은 제외한다", () => {
  for (const path of ["/", "/readme?resume=fe#career_1", "/resume/career-document", "/unknown"]) {
    assert.equal(parseHistoryUrl(path)?.href, new URL(path, "https://history.local").href);
  }
  for (const path of [
    "http://[",
    "",
    "readme",
    "https://history.local/readme",
    "//history.local/readme",
    "//[",
    "/\\example.com/readme",
  ]) {
    assert.equal(parseHistoryUrl(path), null);
  }
});

test("정상 탭과 섞여 저장된 역슬래시·제어 문자·네트워크 경로는 복원에서 제외한다", () => {
  const storedPaths = [
    "/readme?resume=fe",
    "/\\history.local/game",
    "/\t/history.local/game",
    "//history.local",
    "/\\\\x",
    "/game",
  ];

  assert.deepEqual(
    storedPaths.filter(path => parseHistoryUrl(path)),
    ["/readme?resume=fe", "/game"],
  );
});

test("경로 어디에든 역슬래시나 제어 문자가 있으면 제외한다", () => {
  const forbiddenCharacters = [
    "\\",
    ...Array.from({ length: 32 }, (_, code) => String.fromCharCode(code)),
    "\u007f",
  ];
  for (const character of forbiddenCharacters) {
    for (const path of [`/${character}game`, `/game?query=${character}`, `/game#${character}`]) {
      assert.equal(parseHistoryUrl(path), null, JSON.stringify(path));
    }
  }
});

test("원두의 log·round·상세 유형 선택은 같은 탭으로 정규화한다", () => {
  const path = "/hobby/espresso/bean-id";
  for (const query of ["log=log-id&round=round-id", "log=log-id&detail=guide"]) {
    assert.equal(getHistoryPath(`${path}?${query}#detail`), path);
    assert.equal(getHistoryPath(`${path}?${query}&other=keep`), `${path}?other=keep`);
  }
  assert.equal(getHistoryPath("/blog?log=keep&round=3"), "/blog?log=keep&round=3");
  assert.equal(getHistoryPath("/hobby/espresso?detail=keep"), "/hobby/espresso?detail=keep");
});

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

test("대시보드 범주만 탭 정체성에서 제외하고 이동 URL은 보존한다", () => {
  for (const query of ["category=dev", "category=journal", "category=invalid", "category="]) {
    const path = `/blog/dashboard?${query}`;
    assert.equal(getHistoryTabKey(path), "/blog/dashboard");
    assert.equal(getHistoryPath(path), path);
  }
  assert.equal(
    getHistoryTabKey("/blog/dashboard?category=dev&view=list"),
    "/blog/dashboard?view=list",
  );
  assert.equal(
    getHistoryTabKey("/blog/dashboard?category=dev&category=journal"),
    "/blog/dashboard",
  );
  assert.equal(getHistoryTabKey("/blog?category=dev"), "/blog?category=dev");
  assert.equal(getHistoryTabKey("/readme?resume=fe"), "/readme?resume=fe");
  assert.equal(getHistoryTabKey("/readme?resume=pe#career"), "/readme");
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
