import { expect, test } from "@playwright/test";
import { espressoBeans } from "../fixtures/hobby-api";
import { gotoWithRetry as visit, loadMessages, type Locale } from "./test-helpers";

test.use({ extraHTTPHeaders: { "Cache-Control": "no-cache" } });

const bean = espressoBeans[0];
const log = bean.logs[0];
const round = log.rounds[2];
const path = `/hobby/espresso/${bean.id}`;
const messages = loadMessages("ko-KR");
const roundLabel = (locale: Locale) =>
  loadMessages(locale).hobby.espresso.roundLabel.replace("{number}", String(round.roundNumber));

test("라운드3은 데스크톱·모바일 언어 메뉴로 English와 일본어 전환 후에도 유지된다", async ({
  page,
  isMobile,
}) => {
  await visit(page, `/ko-KR${path}`);
  await page
    .getByTestId("espresso-navigation-tree")
    .getByRole("button", { name: roundLabel("ko-KR"), exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 2, name: roundLabel("ko-KR") })).toBeVisible();
  await expect(page).toHaveURL(`/ko-KR${path}?log=${log.id}&round=${round.id}`);
  let currentLocale: Locale = "ko-KR";
  for (const [locale, label] of [
    ["en-US", "english"],
    ["ja-JP", "japanese"],
  ] as const) {
    const currentMessages = loadMessages(currentLocale);
    // 전체 이동 직후 서버 HTML의 메뉴를 누르지 않도록 클라이언트 탭 활성화를 기다린다.
    await expect(
      page.getByTestId("history-tab-rail").locator("button[aria-current='page']"),
    ).toHaveCount(1);
    if (isMobile) await page.getByTestId("sidebar-trigger-mobile").tap();
    const menu = isMobile ? page.getByRole("dialog") : page.locator("#menubar");
    await menu.getByRole("button", { name: currentMessages.menu.language, exact: true }).click();
    await page.getByRole("menuitem", { name: currentMessages.common[label], exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: roundLabel(locale) })).toBeVisible();
    await expect(page).toHaveURL(`/${locale}${path}?log=${log.id}&round=${round.id}`);
    currentLocale = locale;
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: roundLabel("ja-JP") })).toBeVisible();
});

test("상세 유형과 라운드 변경은 history를 늘리거나 탭을 중복 생성하지 않는다", async ({ page }) => {
  await visit(page, "/ko-KR/blog");
  await visit(page, `/ko-KR${path}?other=keep#detail`);
  const historyLength = await page.evaluate(() => history.length);
  const tree = page.getByTestId("espresso-navigation-tree");
  for (const [detail, label] of [
    ["next", "nextTestSettings"],
    ["guide", "adjustmentGuide"],
    ["history", "history"],
    ["current", "currentBasisSettings"],
  ] as const) {
    await tree.getByRole("button", { name: messages.hobby.espresso[label], exact: true }).click();
    const url = `/ko-KR${path}?other=keep&log=${log.id}&detail=${detail}#detail`;
    await expect(page).toHaveURL(url);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 2, name: messages.hobby.espresso[label] }),
    ).toBeVisible();
  }
  await tree.getByRole("button", { name: roundLabel("ko-KR"), exact: true }).click();
  await expect(page).toHaveURL(`/ko-KR${path}?other=keep&log=${log.id}&round=${round.id}#detail`);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await expect(page.getByTestId("history-tab-rail").locator(`div[id^='${path}']`)).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL("/ko-KR/blog");
});

for (const query of [
  `log=${log.id}&round=deleted-round`,
  `log=deleted-log&round=${round.id}`,
  `log=${log.id}&detail=unknown`,
  "round=",
]) {
  test(`잘못된 선택(${query})은 기본 상태로 복구하고 선택 파라미터만 제거한다`, async ({
    page,
  }) => {
    await visit(page, `/ko-KR${path}?${query}&other=keep#detail`);
    await expect(
      page.getByRole("heading", { level: 2, name: messages.hobby.espresso.currentBasisSettings }),
    ).toBeVisible();
    await expect(page).toHaveURL(`/ko-KR${path}?other=keep#detail`);
  });
}

test("기록 없는 원두는 세 언어에서 안내와 목록 복귀를 유지한다", async ({ page }) => {
  for (const locale of ["ko-KR", "en-US", "ja-JP"] as const) {
    const labels = loadMessages(locale).hobby.espresso;
    await visit(page, `/${locale}/hobby/espresso/${espressoBeans[1].id}?log=deleted&round=3`);
    await expect(page.getByText(labels.noLogs, { exact: true })).toBeVisible();
    await expect(page.getByTestId("espresso-navigation-tree")).toHaveCount(0);
    await expect(page).toHaveURL(`/${locale}/hobby/espresso/${espressoBeans[1].id}`);
    await page.getByRole("link", { name: labels.backToList, exact: true }).click();
    await expect(page).toHaveURL(`/${locale}/hobby/espresso`);
    await expect(page.getByTestId("espresso-bean-card")).toHaveCount(espressoBeans.length);
  }
});
