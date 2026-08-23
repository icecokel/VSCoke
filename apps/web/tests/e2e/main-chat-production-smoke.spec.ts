import { expect, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

test.skip(
  process.env.PLAYWRIGHT_PRODUCTION_SMOKE !== "1",
  "운영 smoke 실행에서만 실제 API를 호출합니다.",
);
test.setTimeout(150_000);

test("메인 채팅이 운영 근거 답변과 출처를 표시한다", async ({ page }) => {
  await gotoWithRetry(page, "/ko-KR");

  const composer = page.locator("textarea");
  const submitButton = page.locator('button[type="submit"]');
  await expect(composer).toBeVisible();
  await expect(submitButton).toBeDisabled();

  const responsePromise = page.waitForResponse(
    response =>
      response.request().method() === "POST" &&
      response.url() === "https://api.icecoke.kr/main-chat",
    { timeout: 130_000 },
  );

  await composer.fill("Oprimed 프로젝트에서 맡은 역할과 성과를 알려줘");
  await submitButton.click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);

  const { data } = (await response.json()) as {
    data: {
      answer: string;
      grounded: boolean;
      sources: Array<{ title: string }>;
    };
  };
  expect(data.answer).toEqual(expect.any(String));
  expect(data.grounded).toBe(true);
  expect(data.sources.length).toBeGreaterThan(0);

  const answer = page.locator("article").last();
  await expect(answer).toContainText(data.answer);
  await expect(answer).toContainText(data.sources[0].title);

  console.info(
    "MAIN-G-002 locale=ko-KR status=" +
      response.status() +
      " grounded=" +
      data.grounded +
      " sources=" +
      data.sources.length,
  );
});
