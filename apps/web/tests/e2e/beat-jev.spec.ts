import { expect, test } from "@playwright/test";
import type { GameId, MatchSnapshot } from "../../src/services/beat-jev-service";
import {
  escapeRegExp,
  gotoWithRetry,
  mockBeatJevAvailability,
  resolveLocaleAndMessages,
  type AppMessages,
} from "./test-helpers";

test.beforeEach(async ({ page }) => {
  await mockBeatJevAvailability(page);
});

test("설정 확인 전에는 숨기고 사용 가능한 게임만 카드와 검색에 표시한다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  let enable = () => {};
  const ready = new Promise<void>(resolve => {
    enable = resolve;
  });
  await page.route("**/beat-jev/status", async route => {
    await ready;
    await route.fulfill({ json: { success: true, data: { enabled: true } } });
  });
  await gotoWithRetry(page, `/${locale}/game`);
  const card = page.locator("main").getByRole("button", {
    name: new RegExp(escapeRegExp(messages.Game.beatJev.title)),
  });
  await expect(card).toHaveCount(0);
  enable();
  await expect(card).toBeVisible();

  await page
    .getByRole("button", {
      name: new RegExp(`^${escapeRegExp(messages.sidebar.search)}$`),
    })
    .first()
    .click();
  await page.getByTestId("blog-dashboard-search-input").fill("jev");
  const result = page
    .locator("[data-slot='sidebar-content'] li > button")
    .filter({ hasText: "/game/beat-jev" });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByTestId("beat-jev-game")).toBeVisible();
});

for (const unavailable of [
  { name: "키 미설정", data: { enabled: false } },
  { name: "빈 응답", data: null },
  { name: "잘못된 응답", data: { enabled: "true" } },
  { name: "서버 오류", status: 503 },
  { name: "연결 실패", abort: true },
]) {
  test(`${unavailable.name}이면 카드·검색·직접 URL에서 게임을 숨긴다`, async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await page.route("**/beat-jev/status", async route => {
      if ("abort" in unavailable) {
        await route.abort();
      } else {
        await route.fulfill({
          status: "status" in unavailable ? unavailable.status : 200,
          json: { success: true, data: "data" in unavailable ? unavailable.data : null },
        });
      }
    });
    await gotoWithRetry(page, `/${locale}/game`);
    const gameCenter = page.locator("main.bg-slate-900");
    await expect(gameCenter.getByRole("button")).toHaveCount(2);
    await expect(gameCenter.getByText(messages.Game.beatJev.title)).toHaveCount(0);
    await page
      .getByRole("button", {
        name: new RegExp(`^${escapeRegExp(messages.sidebar.search)}$`),
      })
      .first()
      .click();
    await page.getByTestId("blog-dashboard-search-input").fill("jev");
    await expect(page.locator("[data-slot='sidebar-content'] li > button")).toHaveCount(0);

    await gotoWithRetry(page, `/${locale}/game/beat-jev`);
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game$`));
    await expect(page.getByTestId("beat-jev-game")).toHaveCount(0);
    await expect(
      page.getByTestId("history-tab-rail").locator('button[aria-current="page"]'),
    ).toHaveCount(1);
  });
}

const matchId = "83520f5a-8d3e-4b30-9e0d-31a9695c0935";
const emptyBoard = (size: number) =>
  Array.from({ length: size }, () => Array<"PLAYER" | "JEV" | null>(size).fill(null));
const othelloOpening = emptyBoard(8);
othelloOpening[3][3] = "JEV";
othelloOpening[3][4] = "PLAYER";
othelloOpening[4][3] = "PLAYER";
othelloOpening[4][4] = "JEV";
type UiMessages = AppMessages["Game"]["beatJev"];
const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, String(value)),
    template,
  );

const gameCases: {
  id: GameId;
  data: Record<string, unknown>;
  action: string;
  legalActions?: string[];
  boardTestId: string;
  controlName: (ui: UiMessages) => string;
}[] = [
  {
    id: "connect-four",
    data: { board: emptyBoard(5) },
    action: "column:0",
    boardTestId: "beat-jev-connect-four",
    controlName: ui => formatMessage(ui.columnAction, { number: 1 }),
  },
  {
    id: "othello",
    data: { board: othelloOpening },
    action: "cell:19",
    legalActions: ["cell:19", "cell:26", "cell:37", "cell:44"],
    boardTestId: "beat-jev-othello",
    controlName: ui =>
      `${formatMessage(ui.boardCell, { row: 3, column: 4, owner: ui.empty })} · ${ui.legalMove}`,
  },
  {
    id: "dots-and-boxes",
    data: { edges: [], boxes: emptyBoard(3), scores: { PLAYER: 0, JEV: 0 } },
    action: "edge:h:0:0",
    boardTestId: "beat-jev-dots-and-boxes",
    controlName: ui =>
      formatMessage(ui.edgeAction, { direction: ui.horizontal, row: 1, column: 1 }),
  },
  {
    id: "isolation",
    data: { positions: { PLAYER: 0, JEV: 24 }, blocked: [] },
    action: "cell:1",
    boardTestId: "beat-jev-isolation",
    controlName: ui => formatMessage(ui.boardCell, { row: 1, column: 2, owner: ui.empty }),
  },
  {
    id: "battleship",
    data: {
      ownShips: [[0, 1], [5]],
      ownShots: [{ cell: 0, hit: true, sunk: true }],
      opponentShots: [],
      round: 2,
      pending: false,
    },
    action: "cell:1",
    boardTestId: "beat-jev-battleship",
    controlName: ui => formatMessage(ui.seaCell, { row: 1, column: 2, result: ui.untried }),
  },
  {
    id: "codebreaker",
    data: {
      ownGuesses: [{ code: "012", exact: 1, colorOnly: 1 }],
      round: 2,
      remaining: 5,
      pending: false,
    },
    action: "code:000",
    boardTestId: "beat-jev-codebreaker",
    controlName: ui => ui.submitCode,
  },
  {
    id: "yacht-dice",
    data: {
      dice: [1, 2, 3, 4, 5],
      rollsUsed: 1,
      rounds: { PLAYER: 0, JEV: 0 },
      scorecards: { PLAYER: {}, JEV: {} },
      availableScores: {
        choice: 15,
        "four-kind": 0,
        "full-house": 0,
        "small-straight": 15,
        "large-straight": 30,
        yacht: 0,
      },
    },
    action: "score:choice",
    boardTestId: "beat-jev-yacht-dice",
    controlName: ui => formatMessage(ui.recordCategory, { category: ui.categories.choice }),
  },
  {
    id: "dice-stop",
    data: {
      rounds: { PLAYER: 0, JEV: 0 },
      totals: { PLAYER: 0, JEV: 0 },
      currentPoints: 0,
      rollsUsed: 0,
      lastRoll: null,
    },
    action: "roll",
    boardTestId: "beat-jev-dice-stop",
    controlName: ui => ui.roll,
  },
  {
    id: "bomb-dodge",
    data: { opened: [], bombPosition: null },
    action: "pick:0",
    boardTestId: "beat-jev-bomb-dodge",
    controlName: ui => formatMessage(ui.seaCell, { row: 1, column: 1, result: ui.hidden }),
  },
  {
    id: "blind-card",
    data: {
      available: Array.from({ length: 10 }, (_, index) => index),
      chosenPositions: { PLAYER: null, JEV: null },
      revealed: null,
    },
    action: "pick:0",
    boardTestId: "beat-jev-blind-card",
    controlName: ui => formatMessage(ui.cardPosition, { number: 1, state: ui.hidden }),
  },
];

const snapshotFor = (
  gameId: GameId,
  data: Record<string, unknown>,
  actions: string[],
): MatchSnapshot => ({
  id: matchId,
  revision: 0,
  games: [gameId, null, null],
  gameIndex: 0,
  playerWins: 0,
  jevWins: 0,
  status: "PLAYING",
  game: { gameId, turn: "PLAYER", result: null, data, legalActions: actions },
  history: [],
});

test("10개 게임 화면에서 허용된 행동을 API로 보낸다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  const ui = messages.Game.beatJev;
  let current = gameCases[0];
  const actions: string[] = [];
  await page.route("**/beat-jev/matches**", async route => {
    if (route.request().method() === "POST") {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/matches")) {
        await route.fulfill({
          json: {
            success: true,
            data: snapshotFor(current.id, current.data, current.legalActions ?? [current.action]),
          },
        });
        return;
      }
      if (path.endsWith("/actions")) {
        actions.push(route.request().postDataJSON().action);
        await route.fulfill({
          json: {
            success: true,
            data: {
              ...snapshotFor(current.id, current.data, current.legalActions ?? [current.action]),
              revision: 1,
            },
          },
        });
        return;
      }
    }
    await route.abort();
  });

  for (const gameCase of gameCases) {
    current = gameCase;
    await gotoWithRetry(page, `/${locale}/game/beat-jev`);
    await page.evaluate(() => sessionStorage.removeItem("beat-jev-match-id"));
    await page.reload();
    await page.getByRole("button", { name: ui.startMatch }).click();
    await expect(page.getByTestId(gameCase.boardTestId)).toBeVisible();
    await expect(page.getByText(ui.invalidState)).toHaveCount(0);
    if (gameCase.id === "othello") {
      const board = page.getByTestId(gameCase.boardTestId);
      await expect(board.getByRole("button")).toHaveCount(64);
      await expect(
        board.getByText(formatMessage(ui.othelloScore, { player: 2, jev: 2 })),
      ).toBeVisible();
      await expect(board.getByRole("button", { name: gameCase.controlName(ui) })).toBeEnabled();
      await expect(
        board.getByRole("button", {
          name: formatMessage(ui.boardCell, { row: 1, column: 1, owner: ui.empty }),
        }),
      ).toBeDisabled();
      await page.setViewportSize({ width: 320, height: 700 });
      const boardFits = await board.evaluate(element => {
        const piece = element.querySelector("button span[aria-label]");
        const cell = piece?.parentElement;
        const boardBounds = element.getBoundingClientRect();
        const pieceBounds = piece?.getBoundingClientRect();
        const cellBounds = cell?.getBoundingClientRect();
        return (
          boardBounds.left >= 0 &&
          boardBounds.right <= window.innerWidth &&
          pieceBounds !== undefined &&
          cellBounds !== undefined &&
          pieceBounds.width <= cellBounds.width &&
          pieceBounds.height <= cellBounds.height
        );
      });
      expect(boardFits).toBe(true);
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    if (gameCase.id === "battleship") {
      await expect(
        page.getByRole("button", {
          name: formatMessage(ui.seaCell, { row: 1, column: 1, result: ui.sunk }),
        }),
      ).toBeVisible();
    }
    if (gameCase.id === "codebreaker") {
      const guess = page.getByRole("group", {
        name: formatMessage(ui.guessNumber, { number: 1 }),
      });
      await expect(guess.getByRole("img", { name: ui.colors.rose })).toHaveText("0");
      await expect(guess.getByRole("img", { name: ui.colors.amber })).toHaveText("1");
      await expect(guess.getByRole("img", { name: ui.colors.teal })).toHaveText("2");
    }
    await page.getByRole("button", { name: gameCase.controlName(ui) }).click();
    await expect.poll(() => actions.at(-1)).toBe(gameCase.action);
  }
  expect(actions).toHaveLength(gameCases.length);
});

test("착수 애니메이션은 동작 줄이기 설정을 따른다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  const ui = messages.Game.beatJev;
  const board = emptyBoard(5);
  const actions: string[] = [];
  await page.route("**/beat-jev/matches**", async route => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.abort();
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/matches")) {
      await route.fulfill({
        json: { success: true, data: snapshotFor("connect-four", { board }, ["column:0"]) },
      });
      return;
    }
    if (path.endsWith("/actions")) {
      actions.push(request.postDataJSON().action);
      board[4][actions.length - 1] = "PLAYER";
      await route.fulfill({
        json: {
          success: true,
          data: {
            ...snapshotFor("connect-four", { board }, actions.length === 1 ? ["column:1"] : []),
            revision: actions.length,
          },
        },
      });
      return;
    }
    await route.abort();
  });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await gotoWithRetry(page, `/${locale}/game/beat-jev`);
  await page.getByRole("button", { name: ui.startMatch }).click();
  await page.getByRole("button", { name: formatMessage(ui.columnAction, { number: 1 }) }).click();
  const firstPiece = page
    .getByRole("img", {
      name: formatMessage(ui.boardCell, { row: 5, column: 1, owner: ui.you }),
    })
    .locator("span[aria-label]");
  await expect(firstPiece).toBeVisible();
  await expect
    .poll(() => firstPiece.evaluate(piece => getComputedStyle(piece).animationName))
    .not.toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: formatMessage(ui.columnAction, { number: 2 }) }).click();
  const secondPiece = page
    .getByRole("img", {
      name: formatMessage(ui.boardCell, { row: 5, column: 2, owner: ui.you }),
    })
    .locator("span[aria-label]");
  await expect(secondPiece).toBeVisible();
  await expect
    .poll(() => secondPiece.evaluate(piece => getComputedStyle(piece).animationName))
    .toBe("none");
  expect(actions).toEqual(["column:0", "column:1"]);
});

test("JEV 오류 후 최신 상태를 재조회하고 같은 매치를 이어간다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  const ui = messages.Game.beatJev;
  const board = emptyBoard(5);
  let current = snapshotFor("connect-four", { board }, ["column:0"]);
  let continueCalls = 0;
  const sentRevisions: number[] = [];
  await page.route("**/beat-jev/matches**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET") {
      await route.fulfill({ json: { success: true, data: current } });
      return;
    }
    if (path.endsWith("/matches")) {
      await route.fulfill({ json: { success: true, data: current } });
      return;
    }
    if (path.endsWith("/actions")) {
      sentRevisions.push(request.postDataJSON().revision);
      current = {
        ...current,
        revision: 1,
        game: { ...current.game, turn: "JEV", legalActions: [] },
      };
      await route.fulfill({ json: { success: true, data: current } });
      return;
    }
    if (path.endsWith("/continue")) {
      sentRevisions.push(request.postDataJSON().revision);
      continueCalls += 1;
      if (continueCalls === 1) {
        await route.fulfill({ status: 503, json: { message: "JEV unavailable" } });
        return;
      }
      current = {
        ...current,
        revision: 2,
        status: "ROUND_END",
        playerWins: 1,
        history: [{ gameId: "connect-four", result: "PLAYER" }],
        game: { ...current.game, result: "PLAYER" },
      };
      await route.fulfill({ json: { success: true, data: current } });
      return;
    }
    await route.abort();
  });

  await gotoWithRetry(page, `/${locale}/game/beat-jev`);
  await page.getByRole("button", { name: ui.startMatch }).click();
  await page.getByRole("button", { name: formatMessage(ui.columnAction, { number: 1 }) }).click();
  await expect(page.getByRole("alert").filter({ hasText: ui.requestFailed })).toBeVisible();
  await page.getByRole("button", { name: ui.retry }).click();
  await expect(page.getByText(ui.roundWon)).toBeVisible();
  expect(sentRevisions).toEqual([0, 1, 1]);
});

test("비어 있거나 잘못된 API 응답을 게임 상태로 사용하지 않는다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  const ui = messages.Game.beatJev;
  const responses: unknown[] = [
    null,
    {},
    snapshotFor("connect-four", { board: null }, ["column:0"]),
  ];
  await page.route("**/beat-jev/matches**", async route => {
    await route.fulfill({ json: { success: true, data: responses.shift() } });
  });

  await gotoWithRetry(page, `/${locale}/game/beat-jev`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByRole("button", { name: ui.startMatch }).click();
    await expect(page.getByRole("alert").filter({ hasText: ui.requestFailed })).toBeVisible();
    await expect(page.getByTestId("beat-jev-board")).toHaveCount(0);
  }
  await page.getByRole("button", { name: ui.startMatch }).click();
  await expect(page.getByRole("alert").filter({ hasText: ui.invalidState })).toBeVisible();
});

test("만료된 매치의 저장 정보를 지우고 새 대결을 시작한다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  const ui = messages.Game.beatJev;
  await page.route("**/beat-jev/matches**", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 404, json: { message: "Match expired" } });
      return;
    }
    await route.fulfill({
      json: {
        success: true,
        data: snapshotFor("bomb-dodge", { opened: [], bombPosition: null }, ["pick:0"]),
      },
    });
  });

  await gotoWithRetry(page, `/${locale}/game/beat-jev`);
  await page.evaluate(id => sessionStorage.setItem("beat-jev-match-id", id), matchId);
  await page.reload();
  await expect(page.getByRole("button", { name: ui.startMatch })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("beat-jev-match-id")))
    .toBeNull();
  await page.getByRole("button", { name: ui.startMatch }).click();
  await expect(page.getByTestId("beat-jev-bomb-dodge")).toBeVisible();
});
