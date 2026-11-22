import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  escapeRegExp,
  gotoWithRetry,
  loadMessages,
  resolveLocaleAndMessages,
} from "./test-helpers";

test.beforeEach(async ({ page }) => {
  await page.route("**/game/ranking*", route => route.fulfill({ json: [] }));
  await page.route("**/api/auth/session", route => route.fulfill({ json: null }));
  await page.addInitScript(() => {
    Math.random = () => 0.7;
  });
});

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
  await page.clock.runFor(250);
  const rampContactY = await getBallCenterY(shots.first());
  await page.clock.runFor(30);
  expect(await getBallCenterY(shots.first())).toBeLessThan(rampContactY);
  await page.clock.runFor(420);
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

  test("기본 터치 제스처를 막고 길게 눌렀다 떼면 한 번만 슛을 쏜다", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "실제 터치 시퀀스는 Chromium CDP로 실행한다.");
    const copy = await startRound(page);
    await page.getByRole("button", { name: copy.pickRight, exact: true }).tap();
    await expect(page.getByTestId("basketball-held-ball")).toBeVisible();
    const court = page.getByRole("button", { name: copy.shoot });
    const bounds = await court.boundingBox();
    if (!bounds) throw new Error("농구 코트가 표시되지 않았습니다.");
    await court.evaluate(button => {
      button.addEventListener(
        "touchstart",
        event => button.setAttribute("data-touch-canceled", String(event.defaultPrevented)),
        { once: true, passive: true },
      );
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * 0.8 }],
    });
    await expect(court).toHaveAttribute("data-touch-canceled", "true");
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

test("공마다 폭·위치·속도를 추첨하고 좁고 빠른 조건도 그대로 반복한다", async ({ page }) => {
  const copy = await startRound(page);
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  const meter = page.getByRole("meter", { name: copy.power });
  const targets = meter.locator('[data-target="true"]');
  await pickBall(page, copy.pickLeft);
  await expect(targets).toHaveCount(2);
  expect(await targets.first().evaluate(el => el === el.parentElement?.firstElementChild)).toBe(
    true,
  );
  await releaseShot(page, 30);
  await page.evaluate(() => {
    Math.random = () => 0.99;
  });
  await pickBall(page, copy.pickRight);
  await expect(targets).toHaveCount(5);
  expect(await targets.last().evaluate(el => el === el.parentElement?.lastElementChild)).toBe(true);
  await page.keyboard.down("Space");
  await page.clock.runFor(600);
  const power = Number(await meter.getAttribute("aria-valuenow"));
  expect(power).toBeGreaterThanOrEqual(49);
  expect(power).toBeLessThanOrEqual(51);
  await page.keyboard.up("Space");
  await page.clock.runFor(1200);
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  await pickBall(page, copy.pickLeft);
  await expect(targets).toHaveCount(2);
  await page.keyboard.down("Space");
  await page.clock.runFor(300);
  expect(Number(await meter.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(48);
  await page.keyboard.up("Space");
  await page.clock.runFor(1200);
  await pickBall(page, copy.pickRight);
  await expect(targets).toHaveCount(2);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`림 충돌의 흔들림과 득점 이펙트가 판정에 맞춰 나타난다 (${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion });
    const copy = await startRound(page);
    const art = page.getByTestId("basketball-court-art");
    const effect = page.getByTestId("basketball-score-effect");
    await pickBall(page, copy.pickLeft);
    await releaseShot(page, 280);
    await expect(art).toHaveAttribute("data-impact", "false");
    await page.clock.runFor(740);
    await expect(art).toHaveAttribute("data-impact", "true");
    await expect(effect).toHaveCount(0);
    const translation = await art.evaluate(element => getComputedStyle(element).translate);
    if (reducedMotion === "reduce") {
      expect(translation).toBe("none");
    } else {
      expect(translation).not.toBe("0px");
      expect(translation).not.toBe("none");
    }
    await page.clock.runFor(200);
    await expect(art).toHaveAttribute("data-impact", "false");
    await pickBall(page, copy.pickRight);
    await releaseShot(page, 660);
    await page.clock.runFor(740);
    await expect(effect).toBeVisible();
    await expect(art).toHaveAttribute("data-impact", "false");
    if (reducedMotion === "no-preference") {
      await page.getByTestId("arcade-basketball").screenshot({
        path: testInfo.outputPath("basketball-scoring-effect.png"),
      });
    }
    await page.keyboard.press("Escape");
    const opacity = await effect.evaluate(element => getComputedStyle(element).opacity);
    await page.clock.runFor(1000);
    await expect(effect).toHaveCSS("opacity", opacity);
    await page.getByRole("button", { name: copy.resume }).click();
    await page.clock.runFor(500);
    await expect(effect).toHaveCount(0);
  });
}

test("플립 점수판은 09에서 10으로 넘어갈 때 두 자리를 함께 바꾼다", async ({ page }, testInfo) => {
  const copy = await startRound(page);
  const score = page.getByTestId("basketball-score");
  for (let value = 1; value <= 10; value += 1) {
    await pickBall(page, value % 2 ? copy.pickLeft : copy.pickRight);
    await holdSpace(page, 660);
    await expect(score).toHaveText(String(value).padStart(2, "0"));
  }
  const digits = score.getByTestId("basketball-score-digit");
  await expect(digits).toHaveCount(2);
  await expect(digits.first()).toHaveAttribute("data-value", "1");
  await expect(digits.last()).toHaveAttribute("data-value", "0");
  expect(
    await score.evaluate(element => element.getAnimations({ subtree: true }).length),
  ).toBeGreaterThanOrEqual(2);
  await page.getByTestId("arcade-basketball").screenshot({
    path: testInfo.outputPath("basketball-flip-score.png"),
    animations: "disabled",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await score.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(score).toHaveText("10");
});
