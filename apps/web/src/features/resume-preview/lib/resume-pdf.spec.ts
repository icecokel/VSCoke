import assert from "node:assert/strict";
import test from "node:test";
import { findPageBreak, getPageBreakCandidates } from "./resume-pdf";

// 브라우저 없이 페이지 좌표 계산과 canvas 분할 경계를 검증한다.
const createCanvas = (height: number) =>
  ({ height, width: 1, getContext: () => null }) as unknown as HTMLCanvasElement;

test("상세 제목과 바로 뒤 첫 문단 사이에는 페이지를 나누지 않는다", () => {
  const heading = {
    matches: (selector: string) => selector === "h2",
    getBoundingClientRect: () => ({ top: 400 }),
  };
  const firstParagraph = {
    matches: (selector: string) => selector === "p",
    previousElementSibling: heading,
    getBoundingClientRect: () => ({ top: 450 }),
  };
  const secondParagraph = {
    matches: (selector: string) => selector === "p",
    previousElementSibling: firstParagraph,
    getBoundingClientRect: () => ({ top: 600 }),
  };
  const resumeDocument = {
    getBoundingClientRect: () => ({ top: 100, width: 100 }),
    querySelectorAll: () => [heading, firstParagraph, secondParagraph],
  } as unknown as HTMLElement;
  const canvas = { width: 200 } as HTMLCanvasElement;

  assert.deepEqual(getPageBreakCandidates(resumeDocument, canvas), [600, 1000]);
});

test("기술 절만 남을 짧은 마지막 페이지에는 앞 문맥도 함께 넘긴다", () => {
  const canvas = createCanvas(1130);
  const candidates = [400, 780, 990];
  assert.equal(candidates.filter(candidate => candidate > 700 && candidate <= 1000).at(-1), 990);
  const firstPageHeight = findPageBreak(canvas, 0, 1000, candidates);

  assert.equal(firstPageHeight, 780);
  assert.equal(findPageBreak(canvas, firstPageHeight, 1000, candidates), 350);
});

test("나눈 페이지가 최대 높이를 넘지 않고 전체 구간을 빠짐과 중복 없이 보존한다", () => {
  const canvas = createCanvas(2420);
  const ranges: number[][] = [];
  let sourceY = 0;

  while (sourceY < canvas.height) {
    const height = findPageBreak(canvas, sourceY, 1000, [760, 990, 1460, 1710, 1950, 2260]);
    assert.ok(height > 0 && height <= 1000);
    ranges.push([sourceY, sourceY + height]);
    sourceY += height;
  }

  assert.deepEqual(ranges, [
    [0, 990],
    [990, 1950],
    [1950, 2420],
  ]);
});

test("후보가 없는 페이지는 기존 최대 높이를 지키고 짧은 마지막 구간도 보존한다", () => {
  const canvas = createCanvas(1100);
  assert.equal(findPageBreak(canvas, 0, 1000, []), 1000);
  assert.equal(findPageBreak(canvas, 1000, 1000, []), 100);
});

test("빈 행 탐색도 마지막 페이지에 앞 문맥을 남기는 범위에서 수행한다", () => {
  const canvas = {
    height: 1100,
    width: 1,
    getContext: () => ({
      getImageData: (_x: number, y: number, width: number, height: number) => {
        assert.equal(y, 700);
        assert.equal(height, 100);
        const data = new Uint8ClampedArray(width * height * 4);
        for (let pixel = 0; pixel < data.length; pixel += 4) {
          data.set([247, 246, 243, 255], pixel);
        }
        return { data, width, height };
      },
    }),
  } as unknown as HTMLCanvasElement;

  assert.equal(findPageBreak(canvas, 0, 1000, []), 799);
});
