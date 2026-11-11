import assert from "node:assert/strict";
// 새 의존성 추가 금지에 따라 Vitest 대신 저장소의 기존 node:test 러너를 사용한다.
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderChatAnswer } from "./chat-answer";

const render = (content: string) =>
  renderToStaticMarkup(createElement("div", null, renderChatAnswer(content)));

test("빈 줄은 문단을 나누고 문단 안의 줄바꿈은 유지한다", () => {
  const html = render("첫 줄\n다음 줄\n\n둘째 문단\n \n셋째 문단");
  assert.equal((html.match(/<p /g) ?? []).length, 3);
  assert.match(html, /whitespace-pre-wrap[^>]*>첫 줄\n다음 줄<\/p>/);
  assert.match(html, />둘째 문단<\/p>/);
  assert.match(html, />셋째 문단<\/p>/);
});

test("세 불릿과 번호 목록을 연속된 줄로 묶고 시작 번호를 유지한다", () => {
  const html = render("도입\n- 하나\n* 둘\n• 셋\n3. 셋부터\n4. 넷\n마무리\n\n- 새 목록");
  assert.equal((html.match(/<ul /g) ?? []).length, 2);
  assert.equal((html.match(/<li /g) ?? []).length, 6);
  assert.match(html, /<ol [^>]*start="3"/);
  assert.match(html, />마무리<\/p>/);
  assert.match(html, /list-disc/);
  assert.match(html, /list-decimal/);
});

test("문단과 목록의 짝이 맞는 강조만 strong으로 표시한다", () => {
  const html = render("**첫 강조**와 **두 번째**\n- **목록 강조** [1]\n1. **번호 강조**");
  assert.equal((html.match(/<strong class="font-semibold">/g) ?? []).length, 4);
  assert.match(html, /<strong class="font-semibold">목록 강조<\/strong> \[1\]/);
});

test("미완성 강조와 스트리밍 중 부분 문자열은 그대로 표시한다", () => {
  const answer = "**완성** 뒤 **아직 작성 중";
  for (let length = 0; length <= answer.length; length += 1) {
    assert.doesNotThrow(() => render(answer.slice(0, length)));
  }
  assert.match(render(answer), /<\/strong> 뒤 \*\*아직 작성 중/);
  assert.match(render("닫는 표시**"), />닫는 표시\*\*<\/p>/);
  assert.match(render("**줄바꿈\n넘김**"), />\*\*줄바꿈\n넘김\*\*<\/p>/);
});

test("태그가 아닌 비교 연산자 뒤의 강조를 표시한다", () => {
  for (const content of [
    "비용 < 5 이면 **저렴**",
    "비용 <= 5 이면 **저렴**",
    "- 비용 < 5 이면 **저렴**",
  ]) {
    const html = render(content);
    assert.match(html, /비용 &lt;=? 5 이면 <strong class="font-semibold">저렴<\/strong>/);
  }
});

test("미지원 헤딩의 강조 문법은 원문으로 보존한다", () => {
  const headings = ["# **제목**", "## **부제**", "   ###### **소제목**", "#"];
  const html = render(`**앞**\n${headings.join("\n")}\n**뒤**`);
  assert.match(html, /<strong class="font-semibold">앞<\/strong>/);
  assert.ok(html.includes(headings.join("\n")));
  assert.match(html, /<strong class="font-semibold">뒤<\/strong>/);
  assert.equal((html.match(/<strong /g) ?? []).length, 2);
  assert.doesNotMatch(html, /<h[1-6][\s>]/);
});

test("HTML과 스크립트 및 지원하지 않는 문법은 실행 요소 없이 문자로 표시한다", () => {
  const content =
    '# 제목\n`코드`\n[링크](javascript:alert(1)) https://example.test\n<script>alert(1)</script>\n<img src=x onerror="alert(1)">';
  const html = render(content);
  assert.doesNotMatch(html, /<(?:script|img|a|h1|code)[\s>]/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /# 제목\n`코드`\n\[링크\]\(javascript:alert\(1\)\) https:\/\/example.test/);
});

test("인라인 코드와 링크 안의 강조 문법은 원문으로 보존한다", () => {
  for (const literal of [
    "`**literal**`",
    "``**literal** `code` ``",
    "`**literal**",
    "https://example.test/**literal**",
    "[**literal**](https://example.test/**path**)",
    "![**literal**](https://example.test/image_(1).png)",
    "[**literal**][source]",
    '<img alt="**literal**" onerror="alert(1)">',
  ]) {
    assert.equal(
      render(literal),
      renderToStaticMarkup(
        createElement(
          "div",
          null,
          createElement("p", { className: "whitespace-pre-wrap" }, literal),
        ),
      ),
      literal,
    );
  }
  const html = render("**앞** `**code**` **뒤** https://example.test/**path** **끝**");
  assert.deepEqual(
    [...html.matchAll(/<strong class="font-semibold">(.*?)<\/strong>/g)].map(match => match[1]),
    ["앞", "뒤", "끝"],
  );
});

test("코드 펜스 안의 목록과 강조 및 빈 줄을 원문으로 보존한다", () => {
  for (const literal of [
    "```text\n- literal\n* literal\n• literal\n\n3. literal\n**literal**\n```",
    "~~~text\n- literal\n**literal**\n~~~",
    "````text\n```\n- literal\n\n**literal**\n````",
    "```text\n- literal\n\n**작성 중",
  ]) {
    assert.equal(
      render(literal),
      renderToStaticMarkup(
        createElement(
          "div",
          null,
          createElement("p", { className: "whitespace-pre-wrap" }, literal),
        ),
      ),
      literal,
    );
  }
  const html = render("- **앞**\n```\n- **literal**\n```\n- **뒤**");
  assert.equal((html.match(/<ul /g) ?? []).length, 2);
  assert.equal((html.match(/<li /g) ?? []).length, 2);
  assert.match(html, /```\n- \*\*literal\*\*\n```/);
  assert.match(html, /<strong class="font-semibold">뒤<\/strong>/);
});

test("출처 번호와 원문은 재작성하지 않는다", () => {
  const content = "**근거** [1], [3], [5]\n- 추가 근거 [4]";
  const original = content;
  const html = render(content);
  assert.match(html, /\[1\], \[3\], \[5\]/);
  assert.match(html, /추가 근거 \[4\]/);
  assert.equal(content, original);
});

test("빈 입력과 빈 줄만 있는 입력은 빈 결과를 표시한다", () => {
  assert.equal(render(""), "<div></div>");
  assert.equal(render("\n \n\r\n"), "<div></div>");
});
