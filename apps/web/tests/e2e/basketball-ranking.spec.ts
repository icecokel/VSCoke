import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry } from "./test-helpers";

const copy = ko.Game.arcadeBasketball;
const route = "/ko-KR/game/arcade-basketball";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", response => response.fulfill({ json: null }));
});

test("농구 랭킹을 표로 보여 주고 시작 버튼으로 게임 장면에 진입한다", async ({ page }) => {
  let rankingType = "";
  await page.route("**/game/ranking*", response => {
    rankingType = new URL(response.request().url()).searchParams.get("gameType") ?? "";
    return response.fulfill({
      json: [
        {
          rank: 1,
          score: 24,
          createdAt: "2026-11-21T00:00:00Z",
          user: { displayName: "JUMP SHOT" },
        },
        {
          rank: 2,
          score: 18,
          createdAt: "2026-11-21T00:00:00Z",
          user: { displayName: "민트초코" },
        },
      ],
    });
  });
  await gotoWithRetry(page, route);
  await expect(page.getByRole("table", { name: copy.rankingTitle })).toContainText("JUMP SHOT");
  expect(rankingType).toBe("ARCADE_BASKETBALL");
  await expect(page.getByTestId("basketball-time")).toHaveCount(0);
  await page.getByRole("button", { name: copy.start, exact: true }).click();
  await expect(page.getByTestId("basketball-ready")).toHaveCount(0);
  await expect(page.getByTestId("basketball-countdown")).toHaveText("3");
  await expect(page.getByTestId("basketball-time")).toHaveText("00:30");
});

test("랭킹 장애를 재시도해 빈 랭킹으로 복구하고 게임을 시작한다", async ({ page }) => {
  let isAvailable = false;
  await page.route("**/game/ranking*", response =>
    response.fulfill(isAvailable ? { json: [] } : { status: 503, json: {} }),
  );
  await gotoWithRetry(page, route);
  await expect(page.getByText(ko.Game.loadFailed)).toBeVisible();
  await expect(page.getByRole("button", { name: copy.start, exact: true })).toBeEnabled();
  isAvailable = true;
  await page.getByRole("button", { name: copy.retry }).click();
  await expect(page.getByText(ko.Game.leaderboardEmpty)).toBeVisible();
});

test("로그인 복귀 후 농구 결과를 한 번 제출하고 등수를 표시한다", async ({ page }) => {
  const now = Date.now();
  let submissions = 0;
  await page.addInitScript(
    ({ now }) => {
      sessionStorage.setItem(
        "vscoke-basketball-pending-score",
        JSON.stringify({ score: 12, timestamp: now }),
      );
    },
    { now },
  );
  await page.route("**/api/auth/session", response =>
    response.fulfill({
      json: {
        user: { id: "ranking-user" },
        idToken: "test-id-token",
        idTokenExpiresAt: Math.floor(now / 1000) + 3600,
        expires: new Date(now + 3600000).toISOString(),
      },
    }),
  );
  await page.route("**/game/result", async response => {
    submissions += 1;
    expect(response.request().headers().authorization).toBe("Bearer test-id-token");
    expect(response.request().postDataJSON()).toEqual({
      gameType: "ARCADE_BASKETBALL",
      score: 12,
      playTime: 30,
    });
    await response.fulfill({
      json: {
        id: "223e4567-e89b-42d3-a456-426614174000",
        gameType: "ARCADE_BASKETBALL",
        score: 12,
        rank: 3,
        bestScore: 15,
        allTimeRank: 2,
        weeklyRank: 2,
        createdAt: new Date(now).toISOString(),
        user: { displayName: "Player" },
      },
    });
  });
  await gotoWithRetry(page, route);
  await expect(page.getByTestId("basketball-result")).toBeVisible();
  await expect(page.getByTestId("basketball-score-submit")).toContainText(
    copy.rankResult.replace("{rank}", "3").replace("{best}", "15"),
  );
  expect(submissions).toBe(1);
  expect(
    await page.evaluate(() => sessionStorage.getItem("vscoke-basketball-pending-score")),
  ).toBeNull();
});
