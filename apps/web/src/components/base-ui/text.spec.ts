import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import BaseText from "./text";
import type { TTextType } from "./text.types";

test("BaseText는 기본 요소와 기존 typography별 요소를 유지한다", () => {
  assert.match(renderToStaticMarkup(BaseText({ children: "본문" })), /^<span /);
  const types: TTextType[] = ["h1", "h2", "h3", "h4", "h5", "h6", "body1", "body2", "caption"];
  for (const type of types) {
    const element = type.startsWith("h") ? type : "span";
    assert.match(
      renderToStaticMarkup(BaseText({ type, children: "제목" })),
      new RegExp(`^<${element} class=".+">제목</${element}>$`),
    );
  }
});

test("BaseText의 as는 시각 스타일과 HTML 속성을 유지하며 렌더 요소만 바꾼다", () => {
  const props = {
    type: "h5" as const,
    className: "text-center text-yellow-200",
    id: "resume-title",
    lang: "ko-KR",
    children: "이력서",
  };
  const original = renderToStaticMarkup(BaseText(props));
  assert.equal(
    renderToStaticMarkup(BaseText({ ...props, as: "h1" })),
    original.replaceAll("h5", "h1"),
  );
  assert.equal(
    renderToStaticMarkup(BaseText({ ...props, as: "p" })),
    original.replaceAll("h5", "p"),
  );
});
