import { expect, test, type Page } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import { gotoWithRetry } from "./test-helpers";

const path = "/ko-KR/game/sky-drop";
const game = ko.Game;
let pageErrors: string[];

test.use({ viewport: { width: 1440, height: 900 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/game/ranking*", route => route.fulfill({ json: [] }));
  await page.route("**/api/auth/session", route => route.fulfill({ json: null }));
  await page.clock.install({ time: new Date("2026-09-08T12:00:00Z") });
  await page.addInitScript(() => {
    Math.random = () => 0.5;
    HTMLCanvasElement.prototype.getContext = () => {
      document.documentElement.dataset.canvasAttempts = "1";
      throw new Error("Sky Drop must not use Canvas or WebGL");
    };
  });
});
test.afterEach(async ({ page }) => {
  expect(pageErrors).toEqual([]);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-canvas-attempts", "1");
});

const freeze = async (page: Page) => {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
};
const start = async (page: Page) => {
  await gotoWithRetry(page, path);
  await expect(page.getByTestId("game-start-button")).toBeEnabled();
  await freeze(page);
  await page.getByTestId("game-start-button").click();
  await expect(page.getByTestId("sky-drop-game")).toHaveAttribute("data-state", "playing");
  await expect(page.getByTestId("sky-drop-block")).toHaveCount(9);
};
const counts = (page: Page) =>
  page
    .locator("[data-count]")
    .evaluateAll(elements => elements.map(el => Number(el.getAttribute("data-count"))));

// 실제 DOM에 보이는 색을 이용해서 3개를 맞춘다. 런타임 상태·점수·판정은 조작하지 않는다.
const matchThree = async (page: Page) => {
  const board = await page.getByTestId("sky-drop-block").evaluateAll(elements => {
    const columns: number[][] = [[], [], []];
    for (const element of elements)
      columns[Number(element.getAttribute("data-column"))][
        Number(element.getAttribute("data-row"))
      ] = Number(element.getAttribute("data-color"));
    return columns;
  });
  const queue: { board: number[][]; moves: [number, number][] }[] = [{ board, moves: [] }];
  const seen = new Set([JSON.stringify(board)]);
  let solution: [number, number][] | undefined;
  for (let i = 0; i < queue.length && i < 30000 && !solution; i++) {
    const entry = queue[i];
    if (entry.moves.length >= 8) continue;
    for (let from = 0; from < 3 && !solution; from++) {
      for (let to = 0; to < 3 && !solution; to++) {
        if (from === to || !entry.board[from].length) continue;
        const next = entry.board.map(column => [...column]);
        next[to].push(next[from].pop()!);
        const moves: [number, number][] = [...entry.moves, [from, to]];
        const tail = next[to].slice(-3);
        if (tail.length === 3 && tail.every(color => color === tail[0])) solution = moves;
        else {
          const key = JSON.stringify(next);
          if (!seen.has(key)) {
            seen.add(key);
            queue.push({ board: next, moves });
          }
        }
      }
    }
  }
  expect(solution).toBeDefined();
  for (const [from, to] of solution!) {
    await page.getByTestId(`sky-drop-column-${from}`).click();
    await page.getByTestId(`sky-drop-column-${to}`).click();
  }
  await expect(page.getByTestId("sky-drop-score")).toHaveText("100");
};

test("DOM 보드가 Canvas 없이 시작하고 QWE·취소·키 반복 방지가 동작한다", async ({ page }) => {
  await start(page);
  await page.keyboard.down("q");
  await expect(page.getByTestId("sky-drop-column-0")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.down("q");
  await expect(page.getByTestId("sky-drop-column-0")).toHaveAttribute("data-count", "2");
  await page.keyboard.up("q");
  await page.keyboard.press("w");
  expect(await counts(page)).toEqual([2, 4, 3]);
  await page.keyboard.press("e");
  await page.keyboard.press("e");
  expect(await counts(page)).toEqual([2, 4, 3]);
  await expect(page.locator('[data-held="true"]')).toHaveCount(0);
});

test("실제 DOM 블록을 매칭하고 게임 오버·결과·재시작까지 완주한다", async ({ page }) => {
  await start(page);
  await matchThree(page);
  await page.clock.runFor(35000);
  await expect(page.getByTestId("sky-drop-result")).toBeVisible();
  await expect(page.getByTestId("sky-drop-final-score")).toHaveText("100");
  await page.getByTestId("sky-drop-share").click();
  await expect(page.getByRole("alertdialog")).toContainText(game.skyDrop.loginDescription);
  await page.getByRole("button", { name: game.skyDrop.cancel, exact: true }).click();
  await page.getByTestId("sky-drop-restart").click();
  await expect(page.getByTestId("sky-drop-score")).toHaveText("0");
  expect(await counts(page)).toEqual([3, 3, 3]);
});

test("일시정지·재개는 시간과 생성을 보존하고 나가기는 타이머를 정리한다", async ({ page }) => {
  await start(page);
  await page.clock.runFor(1000);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("sky-drop-paused")).toBeVisible();
  await expect(page.getByRole("button", { name: game.skyDrop.resume, exact: true })).toBeFocused();
  await page.clock.runFor(60000);
  await page.keyboard.press("q");
  expect(await counts(page)).toEqual([3, 3, 3]);
  await expect(page.getByTestId("sky-drop-time")).toHaveText("00:01");
  await page.keyboard.press("Escape");
  await page.clock.runFor(2200);
  expect(await counts(page)).toEqual([4, 4, 4]);
  await page.getByRole("button", { name: game.skyDrop.pause, exact: true }).click();
  await page.getByRole("button", { name: game.exit, exact: true }).click();
  await expect(page).toHaveURL(/\/ko-KR\/game$/);
  await page.clock.runFor(60000);
  await expect(page.getByTestId("sky-drop-game")).toHaveCount(0);
});

test("탭이 숨겨지면 자동으로 멈추고 돌아와도 명시적으로 재개한다", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("sky-drop-paused")).toBeVisible();
  await page.clock.runFor(120000);
  expect(await counts(page)).toEqual([3, 3, 3]);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("sky-drop-paused")).toBeVisible();
  await page.getByRole("button", { name: game.skyDrop.resume, exact: true }).click();
  await page.clock.runFor(3100);
  expect(await counts(page)).toEqual([4, 4, 4]);
});

test("로그인 복귀의 기존 pendingScore가 시작 화면 뒤에 숨지 않고 재시작 시 비워진다", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "pendingScore",
      JSON.stringify({
        gameName: "sky-drop",
        score: 1200,
        timestamp: Date.now(),
        playTime: 42,
        requiresManualLogin: true,
      }),
    ),
  );
  await gotoWithRetry(page, path);
  await expect(page.getByTestId("sky-drop-final-score")).toHaveText("1,200");
  await expect(page.getByTestId("game-start-button")).toHaveCount(0);
  await page.getByTestId("sky-drop-restart").click();
  await expect(page.getByTestId("sky-drop-score")).toHaveText("0");
  expect(await page.evaluate(() => localStorage.getItem("pendingScore"))).toBeNull();
});

for (const raw of [
  "{",
  "[]",
  JSON.stringify({ gameName: "sky-drop", score: -100, timestamp: 1 }),
  JSON.stringify({ gameName: "wordle", score: 100, timestamp: 1 }),
]) {
  test(`파손·다른 게임 pendingScore ${raw}는 무시하고 새 게임을 연다`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("pendingScore", value), raw);
    await start(page);
    await expect(page.getByTestId("sky-drop-score")).toHaveText("0");
  });
}

const authenticate = async (page: Page) => {
  await page.route("**/api/auth/session", route =>
    route.fulfill({
      json: {
        user: { id: "test-player", name: "Test Player" },
        expires: "2099-01-01T00:00:00Z",
        idToken: "test-id-token",
        idTokenExpiresAt: 4102444800,
      },
    }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "pendingScore",
      JSON.stringify({ gameName: "sky-drop", score: 1200, timestamp: Date.now(), playTime: 42 }),
    ),
  );
};

test("점수·플레이 시간 제출은 한 번만 실행하고 결과 ID로 공유한다", async ({ page }) => {
  await authenticate(page);
  const requests: unknown[] = [];
  await page.route("**/game/result", async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        id: "0cba51f6-c832-4e29-97a5-b4f4677b63c1",
        score: 1200,
        rank: 2,
        weeklyRank: 1,
        bestScore: 1200,
      },
    });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.shared = text;
        },
      },
    });
  });
  await gotoWithRetry(page, path);
  await expect(page.getByTestId("sky-drop-submit")).toHaveText(game.submitted);
  await expect(page.getByTestId("sky-drop-submit")).toBeDisabled();
  expect(requests).toEqual([{ gameType: "SKY_DROP", score: 1200, playTime: 42 }]);
  await page.getByTestId("sky-drop-share").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared",
    /\/ko-KR\/share\/0cba51f6-c832-4e29-97a5-b4f4677b63c1/,
  );
  expect(await page.evaluate(() => localStorage.getItem("pendingScore"))).toBeNull();
});

for (const status of [401, 503]) {
  test(`${status} 점수 저장 실패는 성공으로 숨기거나 무한 재시도하지 않는다`, async ({ page }) => {
    await authenticate(page);
    let attempts = 0;
    await page.route("**/game/result", route => {
      attempts++;
      return route.fulfill({ status, json: { message: "test failure" } });
    });
    await gotoWithRetry(page, path);
    await expect(page.getByTestId("sky-drop-submit")).toHaveText(
      status === 401 ? game.loginAndSubmit : game.submitScore,
    );
    await page.clock.runFor(5000);
    expect(attempts).toBe(1);
    await expect(page.getByTestId("sky-drop-submit")).toBeEnabled();
    if (status === 503) {
      await page.getByTestId("sky-drop-submit").click();
      await expect.poll(() => attempts).toBe(2);
    }
  });
}

test("오디오 재생 실패에도 DOM 게임이 계속 진행된다", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException("Blocked", "NotAllowedError"));
  });
  await start(page);
  await page.keyboard.press("q");
  await page.keyboard.press("w");
  expect(await counts(page)).toEqual([2, 4, 3]);
  await page.getByRole("button", { name: game.skyDrop.mute }).click();
  await expect(page.getByRole("button", { name: game.skyDrop.unmute })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

for (const viewport of [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
]) {
  test(`${viewport.width}×${viewport.height}에서 터치·회전·일시정지 조작에 넘침이 없다`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await start(page);
    await page.getByTestId("sky-drop-column-0").tap();
    await page.getByTestId("sky-drop-column-1").tap();
    expect(await counts(page)).toEqual([2, 4, 3]);
    const boardBox = await page.getByTestId("sky-drop-board").boundingBox();
    expect(boardBox!.width).toBeGreaterThan(200);
    expect(boardBox!.height).toBeGreaterThan(120);
    await expect(
      page.getByRole("button", { name: game.skyDrop.pause, exact: true }),
    ).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    expect(await counts(page)).toEqual([2, 4, 3]);
    await page.getByRole("button", { name: game.skyDrop.pause, exact: true }).click();
    await expect(page.getByRole("button", { name: game.exit, exact: true })).toBeInViewport();
  });
}

for (const [locale, messages] of [
  ["en-US", en],
  ["ja-JP", ja],
] as const) {
  test(`${locale}의 규칙·일시정지·결과를 번역한다`, async ({ page }) => {
    await gotoWithRetry(page, `/${locale}/game/sky-drop`);
    await expect(page.getByText(messages.Game.skyDrop.rules)).toBeVisible();
    await freeze(page);
    await page.getByTestId("game-start-button").click();
    await page.getByRole("button", { name: messages.Game.skyDrop.pause, exact: true }).click();
    await expect(page.getByRole("heading", { name: messages.Game.skyDrop.paused })).toBeVisible();
    await page.getByRole("button", { name: messages.Game.skyDrop.resume, exact: true }).click();
    await page.clock.runFor(31000);
    await expect(page.getByRole("heading", { name: messages.Game.gameOver })).toBeVisible();
  });
}

test("재로그인이 필요한 복원 결과는 기존 세션으로 자동 제출하지 않는다", async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "pendingScore",
      JSON.stringify({
        gameName: "sky-drop",
        score: 1200,
        timestamp: Date.now(),
        playTime: 42,
        requiresManualLogin: true,
      }),
    ),
  );
  let attempts = 0;
  await page.route("**/game/result", route => {
    attempts++;
    return route.fulfill({ json: { score: 1200 } });
  });
  await gotoWithRetry(page, path);
  await expect(page.getByTestId("sky-drop-submit")).toHaveText(game.loginAndSubmit);
  await page.clock.runFor(5000);
  expect(attempts).toBe(0);
});
