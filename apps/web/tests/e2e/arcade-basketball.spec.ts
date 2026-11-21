import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  escapeRegExp,
  gotoWithRetry,
  loadMessages,
  resolveLocaleAndMessages,
} from "./test-helpers";

const prepareClock = async (page: Page) => {
  await page.clock.install();
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1_000);
};

const startRound = async (page: Page) => {
  const locale = "ko-KR";
  const messages = loadMessages(locale);
  await gotoWithRetry(page, `/${locale}/game/arcade-basketball`);
  await prepareClock(page);
  const copy = messages.Game.arcadeBasketball;
  await page.getByRole("button", { name: copy.start, exact: true }).click();
  await page.clock.runFor(3_040);
  return copy;
};

const pickBall = async (page: Page, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("basketball-held-ball")).toBeVisible();
};

const releaseShot = async (page: Page, durationMs: number) => {
  await page.keyboard.down("Space");
  await page.clock.runFor(durationMs);
  await page.keyboard.up("Space");
};

const holdSpace = async (page: Page, durationMs: number) => {
  await releaseShot(page, durationMs);
  await page.clock.runFor(740);
};

const getBounds = async (ball: Locator) => {
  await expect(ball).toBeVisible();
  const bounds = await ball.boundingBox();
  if (!bounds) throw new Error("농구공이 표시되지 않았습니다.");
  return bounds;
};

const getBallCenterY = async (ball: Locator) => {
  const bounds = await getBounds(ball);
  return bounds.y + bounds.height / 2;
};

test("게임 센터에서 열고 카운트다운 뒤 키보드로 득점한다", async ({ page }) => {
  const { locale, messages } = await resolveLocaleAndMessages(page);
  const copy = messages.Game.arcadeBasketball;
  await gotoWithRetry(page, `/${locale}/game`);
  await page.getByRole("button", { name: new RegExp(escapeRegExp(copy.title)) }).click();
  await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
  await prepareClock(page);

  const countdown = page.getByTestId("basketball-countdown");
  const score = page.getByTestId("basketball-score");
  const time = page.getByTestId("basketball-time");
  const power = page.getByRole("meter", { name: copy.power });
  await page.getByRole("button", { name: copy.start, exact: true }).click();
  await expect(countdown).toHaveText("3");
  await expect(time).toHaveText("00:30");
  await page.keyboard.down("Space");
  await page.clock.runFor(1_040);
  await page.keyboard.up("Space");
  await expect(countdown).toHaveText("2");
  await expect(power).toHaveAttribute("aria-valuenow", "0");
  await page.clock.runFor(2_000);
  await expect(countdown).toBeHidden();
  await expect(page.getByRole("button", { name: copy.shoot })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("basketball-held-ball")).toBeVisible();

  await page.keyboard.down("Space");
  await page.clock.runFor(660);
  await expect(power).toHaveAttribute("data-perfect", "true");
  await expect(score).toHaveText("00");
  await page.keyboard.up("Space");
  await page.clock.runFor(740);
  await expect(page.getByTestId("basketball-feedback")).toContainText(copy.basket);
  await expect(score).toHaveText("01");
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`슛을 놓으면 공이 올라갔다가 골대로 내려온다 (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const copy = await startRound(page);
    await pickBall(page, copy.pickLeft);
    const heldBall = page.getByTestId("basketball-held-ball");
    const shotBall = page.getByTestId("basketball-shot-ball");
    const score = page.getByTestId("basketball-score");

    await page.keyboard.down("Space");
    await page.clock.runFor(660);
    const heldCenter = await getBallCenterY(heldBall);
    await page.keyboard.up("Space");

    await page.clock.runFor(290);
    const risingCenter = await getBallCenterY(shotBall);
    await page.clock.runFor(160);
    const apexCenter = await getBallCenterY(shotBall);
    await page.clock.runFor(170);
    const descendingCenter = await getBallCenterY(shotBall);

    expect(risingCenter).toBeLessThan(heldCenter);
    expect(apexCenter).toBeLessThan(risingCenter);
    expect(descendingCenter).toBeGreaterThan(apexCenter);
    await expect(score).toHaveText("00");
    await page.clock.runFor(120);
    await expect(score).toHaveText("01");
  });
}

test("양쪽 공을 집고 먼저 돌아온 공을 다시 사용할 수 있다", async ({ page }) => {
  const copy = await startRound(page);
  const left = page.getByRole("button", { name: copy.pickLeft, exact: true });
  const right = page.getByRole("button", { name: copy.pickRight, exact: true });
  const held = page.getByTestId("basketball-held-ball");
  const shots = page.getByTestId("basketball-shot-ball");

  await expect(page.getByTestId("basketball-tray-ball")).toHaveCount(2);
  await page.keyboard.press("ArrowRight");
  const beforePickup = await getBounds(held);
  await page.clock.runFor(250);
  const afterPickup = await getBounds(held);
  expect(afterPickup.x + afterPickup.width / 2).toBeLessThan(
    beforePickup.x + beforePickup.width / 2,
  );
  await expect(page.getByTestId("basketball-tray-ball")).toHaveCount(1);

  await releaseShot(page, 280);
  await expect(shots).toHaveCount(1);
  await expect(right).toBeHidden();
  await pickBall(page, copy.pickLeft);
  await releaseShot(page, 280);
  await expect(shots).toHaveCount(2);
  await expect(left).toBeHidden();
  await expect(right).toBeHidden();
  await expect(page.getByText(copy.waitingForBall)).toBeVisible();

  await page.clock.runFor(410);
  const contactY = await getBallCenterY(shots.first());
  await page.clock.runFor(100);
  expect(await getBallCenterY(shots.first())).toBeLessThan(contactY);
  await page.clock.runFor(235);
  const rampContactY = await getBallCenterY(shots.first());
  await page.clock.runFor(60);
  expect(await getBallCenterY(shots.first())).toBeLessThan(rampContactY);
  await page.clock.runFor(405);
  await expect(right).toBeVisible();
  await expect(left).toBeHidden();
  await pickBall(page, copy.pickRight);
});

test("짧거나 길게 누른 슛은 실패하고 마우스가 코트 밖에서 놓여도 슛을 판정한다", async ({
  page,
}) => {
  const copy = await startRound(page);
  const feedback = page.getByTestId("basketball-feedback");
  await pickBall(page, copy.pickLeft);
  await holdSpace(page, 280);
  await expect(feedback).toHaveText(copy.short);
  await pickBall(page, copy.pickRight);
  await holdSpace(page, 1_050);
  await expect(feedback).toHaveText(copy.long);
  await expect(page.getByTestId("basketball-score")).toHaveText("00");
  await pickBall(page, copy.pickLeft);

  const court = page.getByRole("button", { name: copy.shoot });
  const art = page.getByTestId("basketball-held-ball");
  await expect(art).toHaveAttribute("draggable", "false");
  const canStartDrag = await art.evaluate(element =>
    element.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true })),
  );
  expect(canStartDrag).toBe(false);

  await court.hover();
  await page.mouse.down();
  await page.mouse.move(2, 2, { steps: 8 });
  await page.clock.runFor(660);
  await expect(page.getByRole("meter", { name: copy.power })).toHaveAttribute(
    "data-perfect",
    "true",
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await page.mouse.up();
  await page.clock.runFor(740);
  await expect(feedback).toContainText(copy.basket);
  await expect(page.getByTestId("basketball-score")).toHaveText("01");
});

test("탭이 비활성화되면 시간은 멈추고 충전이 취소된다", async ({ page }) => {
  const copy = await startRound(page);
  const time = page.getByTestId("basketball-time");
  const power = page.getByRole("meter", { name: copy.power });
  await pickBall(page, copy.pickLeft);
  await page.keyboard.down("Space");
  await page.clock.runFor(660);
  await expect(power).toHaveAttribute("data-perfect", "true");

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog", { name: copy.paused })).toBeVisible();
  await expect(time).toHaveText("00:30");
  await page.keyboard.up("Space");
  await page.clock.fastForward(10_000);
  await expect(time).toHaveText("00:30");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await page.getByRole("button", { name: copy.resume }).click();
  await expect(power).toHaveAttribute("aria-valuenow", "0");
  await page.clock.runFor(450);
  await expect(time).toHaveText("00:29");
  await expect(page.getByTestId("basketball-score")).toHaveText("00");
  await holdSpace(page, 660);
  await expect(page.getByTestId("basketball-score")).toHaveText("01");
});

test("종료 전에 놓은 슛을 판정하고 최고 기록이 새로고침 뒤에도 남는다", async ({ page }) => {
  const copy = await startRound(page);
  const result = page.getByTestId("basketball-result");
  const time = page.getByTestId("basketball-time");
  await pickBall(page, copy.pickLeft);
  await page.clock.fastForward(29_160);
  await page.keyboard.down("Space");
  await page.clock.runFor(660);
  await page.keyboard.up("Space");
  await page.clock.runFor(180);
  await expect(time).toHaveText("00:00");
  await expect(result).toBeHidden();
  await page.clock.runFor(560);
  await expect(result).toBeVisible();
  await expect(page.getByTestId("basketball-best")).toHaveText("1");
  await expect(page.getByTestId("basketball-score")).toHaveText("01");

  await page.reload();
  await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
  await page.getByRole("button", { name: copy.start, exact: true }).click();
  await page.clock.runFor(3_100);
  await expect(page.getByTestId("basketball-score")).toHaveText("00");
  await pickBall(page, copy.pickRight);
  await page.clock.fastForward(29_500);
  await page.keyboard.down("Space");
  await page.clock.runFor(550);
  await page.keyboard.up("Space");
  await expect(result).toBeVisible();
  await expect(page.getByTestId("basketball-score")).toHaveText("00");
  await expect(page.getByTestId("basketball-best")).toHaveText("1");

  await page.getByRole("button", { name: copy.restart }).click();
  await expect(page.getByTestId("basketball-countdown")).toHaveText("3");
  await expect(time).toHaveText("00:30");
});

test.describe("모바일 터치", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("공을 길게 터치하고 떼면 한 번만 슛을 쏜다", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "실제 터치 시퀀스는 Chromium CDP로 실행한다.");
    const copy = await startRound(page);
    await page.getByRole("button", { name: copy.pickRight, exact: true }).tap();
    await expect(page.getByTestId("basketball-held-ball")).toBeVisible();
    const court = page.getByRole("button", { name: copy.shoot });
    const bounds = await court.boundingBox();
    if (!bounds) throw new Error("농구 코트가 표시되지 않았습니다.");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * 0.8 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: bounds.x + 10, y: Math.max(1, bounds.y - 15) }],
    });
    await page.clock.runFor(700);
    await expect(page.getByRole("meter", { name: copy.power })).toHaveAttribute(
      "data-perfect",
      "true",
    );
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.clock.runFor(1_250);
    await expect(page.getByTestId("basketball-score")).toHaveText("01");
  });
});
