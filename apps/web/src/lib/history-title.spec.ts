import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator } from "next-intl";
import koreanMessages from "../../messages/ko-KR.json";
import englishMessages from "../../messages/en-US.json";
import japaneseMessages from "../../messages/ja-JP.json";
import { getHistoryTitle } from "./history-title";

for (const [locale, messages] of [
  ["ko-KR", koreanMessages],
  ["en-US", englishMessages],
  ["ja-JP", japaneseMessages],
] as const) {
  test(`${locale} 손상된 경로는 안전한 대체 제목을 반환한다`, () => {
    const t = createTranslator({ locale, messages, namespace: "historyTabs" });
    for (const path of [
      "http://[",
      "",
      "readme",
      "https://example.com/readme",
      "//[",
      "/\\example.com/readme",
    ]) {
      assert.equal(getHistoryTitle(path, t), "Home");
      assert.equal(getHistoryTitle(path, t, { documentTitle: "Saved title" }), "Saved title");
      assert.equal(getHistoryTitle(path, t, { navigationTitle: "Link title" }), "Link title");
    }
    assert.equal(
      getHistoryTitle("/game", t, {
        documents: [
          { path: "http://[", title: "Broken title" },
          { path: "/game", title: messages.home.cards.gameTitle },
        ],
      }),
      messages.home.cards.gameTitle,
    );
  });

  test(`${locale} README 제목은 진입 경로의 제목보다 URL의 variant를 우선한다`, () => {
    const t = createTranslator({ locale, messages, namespace: "historyTabs" });
    for (const path of ["/readme", "/readme?resume=pe#career_1"]) {
      assert.equal(getHistoryTitle(path, t), "README.md");
      assert.equal(getHistoryTitle(path, t, { documentTitle: "readme" }), "README.md");
    }
    assert.equal(getHistoryTitle("/readme?resume=fe", t), "README.md · FE");
    assert.equal(
      getHistoryTitle("/readme?resume=fe#career_1", t, { documentTitle: "README.md" }),
      "README.md · FE",
    );
    assert.equal(getHistoryTitle("/readme?resume=nexon", t), "README.md · nexon");
  });

  test(`${locale} 경력 상세는 URL로 조회한 문서 이름을 쓰고 조회 전에는 slug를 쓴다`, () => {
    const t = createTranslator({ locale, messages, namespace: "historyTabs" });
    const path = "/resume/career-document?resume=fe#section";
    assert.equal(getHistoryTitle(path, t), "career-document");
    assert.equal(getHistoryTitle(path, t, { navigationTitle: "Search title" }), "career-document");
    assert.equal(getHistoryTitle(path, t, { documentTitle: "Career document" }), "Career document");
    assert.equal(getHistoryTitle("/resume/question", t), "question");
    assert.equal(getHistoryTitle("/resume/preview", t), "preview");
  });

  test(`${locale} 일반 문서는 URL로 색인 제목을 조회하고 저장된 제목을 보존한다`, () => {
    const t = createTranslator({ locale, messages, namespace: "historyTabs" });
    const documents = [
      { path: "/game", title: messages.home.cards.gameTitle },
      { path: "/blog", title: messages.blog.title },
      { path: "/blog/journal/post", title: "Post title" },
      { path: "/hobby/recipes", title: messages.hobby.recipes.title },
    ];
    for (const { path, title } of documents) {
      for (const suffix of ["", "?query=1#section"]) {
        assert.equal(getHistoryTitle(`${path}${suffix}`, t, { documents }), title);
        assert.equal(
          getHistoryTitle(`${path}${suffix}`, t, { documents, documentTitle: "old title" }),
          title,
        );
      }
    }
    assert.equal(
      getHistoryTitle("/package", t, { documents, documentTitle: "package.json" }),
      "package.json",
    );
    assert.equal(
      getHistoryTitle("/blog/post", t, { documentTitle: "Saved post title" }),
      "Saved post title",
    );
    assert.equal(
      getHistoryTitle("/package", t, { navigationTitle: "package.json" }),
      "package.json",
    );
    assert.equal(getHistoryTitle("/", t, { documents }), "Home");
    assert.equal(getHistoryTitle("/unknown/path?query=1#section", t, { documents }), "path");
    assert.equal(getHistoryTitle("/share/id?query=1#section", t, { documents }), "share");
    assert.equal(getHistoryTitle("/readme?resume=fe", t, { documents }), "README.md · FE");
    assert.equal(
      getHistoryTitle("/resume/career-document", t, {
        documents: [{ path: "/resume/career-document", title: "Search title" }],
        documentTitle: "Career document",
      }),
      "Career document",
    );
  });
}
