import { createElement, type ReactNode } from "react";

type AnswerBlock = {
  kind: "p" | "ul" | "ol" | "literal";
  lines: string[];
  start?: number;
};

const renderEmphasis = (text: string, offset: number): ReactNode[] =>
  text
    .split(/(\*\*.+?\*\*)/g)
    .map((part, index) =>
      index % 2 === 1
        ? createElement(
            "strong",
            { key: `${offset}-${index}`, className: "font-semibold" },
            part.slice(2, -2),
          )
        : part,
    );

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let offset = 0;
  // 미지원 구문을 먼저 분리해 내부의 별표까지 강조로 해석하지 않는다.
  const literals =
    /^ {0,3}#{1,6}(?:[ \t][^\n]*|$)|(`+)[\s\S]*?\1(?!`)|`+[\s\S]*$|!?\[[^\]\n]*\](?:\((?:[^()\n]|\([^()\n]*\))*\)|\[[^\]\n]*\])|<\/?[a-z][a-z\d-]*(?=[\s/>]|$)[^>\n]*(?:>|$)|\b[a-z][a-z\d+.-]*:\/\/[^\s<>]+/gim;
  for (const match of text.matchAll(literals)) {
    nodes.push(...renderEmphasis(text.slice(offset, match.index), offset), match[0]);
    offset = match.index + match[0].length;
  }
  nodes.push(...renderEmphasis(text.slice(offset), offset));
  return nodes;
};

export const renderChatAnswer = (content: string): ReactNode[] => {
  const blocks: AnswerBlock[] = [];
  let current: AnswerBlock | undefined;
  let fence: string | undefined;

  for (const line of content.split(/\r?\n/)) {
    if (fence && current) {
      current.lines.push(line);
      const closing = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line)?.[1];
      if (closing?.[0] === fence[0] && closing.length >= fence.length) {
        fence = undefined;
        current = undefined;
      }
      continue;
    }

    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (opening) {
      fence = opening;
      current = { kind: "literal", lines: [line] };
      blocks.push(current);
      continue;
    }

    if (line.trim() === "") {
      current = undefined;
      continue;
    }

    const match = /^(?:[-*•] |(\d+)\. )(.*)$/.exec(line);
    const kind = match ? (match[1] === undefined ? "ul" : "ol") : "p";
    if (!current || current.kind !== kind) {
      current = { kind, lines: [], start: kind === "ol" ? Number(match?.[1]) : undefined };
      blocks.push(current);
    }
    current.lines.push(match ? match[2] : line);
  }

  return blocks.map((block, index) =>
    block.kind === "p" || block.kind === "literal"
      ? createElement(
          "p",
          { key: index, className: "whitespace-pre-wrap" },
          block.kind === "literal" ? block.lines.join("\n") : renderInline(block.lines.join("\n")),
        )
      : createElement(
          block.kind,
          {
            key: index,
            className: `${block.kind === "ul" ? "list-disc" : "list-decimal"} space-y-1 pl-5`,
            start: block.start,
          },
          block.lines.map((line, lineIndex) =>
            createElement(
              "li",
              { key: lineIndex, className: "whitespace-pre-wrap" },
              renderInline(line),
            ),
          ),
        ),
  );
};
