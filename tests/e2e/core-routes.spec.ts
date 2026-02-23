import { expect, Locator, Page, test } from "@playwright/test";
import {
  escapeRegExp,
  expectPath,
  expectWordleKeyboardButtons,
  resolveLocaleAndMessages,
  visit,
} from "./test-helpers";

const openQrDialogAndCopy = async (page: Page, scope: Page | Locator, copyLabel: string) => {
  await scope.getByTestId("share-qr-trigger").first().click();

  const dialog = page.getByRole("dialog").first();
  const dialogOpened = await dialog.isVisible({ timeout: 5000 }).catch(() => false);

  if (!dialogOpened) {
    return;
  }

  const copyButtonByTestId = page.getByTestId("share-qr-copy").first();
  const copyButtonByLabel = page.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(copyLabel)}$`),
  });

  if (await copyButtonByTestId.isVisible({ timeout: 2000 }).catch(() => false)) {
    await copyButtonByTestId.click();
  } else if (await copyButtonByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await copyButtonByLabel.first().click();
  }

  const closeButton = dialog.getByRole("button", { name: /close/i });
  if ((await closeButton.count()) > 0) {
    await closeButton.first().click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(dialog).toBeHidden();
};

test.describe("코어 라우트 CTA 시나리오", () => {
  test.setTimeout(120000);

  test("메뉴바 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}`);

    const menuBar = page.locator("#menubar");
    await expect(menuBar).toBeVisible();

    await menuBar.getByTestId("menubar-trigger-1").click();
    await page.getByTestId("menu-item-1-0").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const visibleButtons = dialog.locator("button:visible");
    expect(await visibleButtons.count()).toBeGreaterThanOrEqual(8);

    const cancelButton = dialog.getByTestId("open-project-cancel").first();
    const openButton = dialog.getByTestId("open-project-confirm").first();

    await expect(openButton).toBeDisabled();
    await dialog.getByTestId("open-project-project-0-0").first().click();
    await expect(openButton).toBeEnabled();
    await cancelButton.click();
    await expect(dialog).toBeHidden();

    await menuBar.getByTestId("menubar-trigger-3").click();
    await expect(page.getByTestId("menu-item-3-0")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("menuitem", {
        name: new RegExp(`^${escapeRegExp(messages.menu.preparing)}$`),
      }),
    ).toBeVisible();
  });

  test("홈 CTA 전체 경로 검증", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    await visit(page, `/${locale}`);

    const heroSection = page.locator('[data-testid="home-hero"]');
    await expect(heroSection).toHaveCount(1);

    const primaryCta = heroSection.getByTestId("home-primary-cta");
    const secondaryCta = heroSection.getByTestId("home-secondary-cta");

    await expect(primaryCta).toBeVisible();
    await expect(secondaryCta).toBeVisible();

    await primaryCta.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/readme$`));
    await visit(page, `/${locale}`);

    await secondaryCta.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));
    await visit(page, `/${locale}`);

    const quickLaunchGrid = page.getByTestId("home-quick-launch-grid");
    await expect(quickLaunchGrid).toHaveCount(1);
    await expect(quickLaunchGrid.locator("button")).toHaveCount(4);

    const quickCtaCases = ["readme", "blog", "blog-dashboard", "game"] as const;

    for (const key of quickCtaCases) {
      const cta = quickLaunchGrid.getByTestId(`home-quick-launch-${key}`).first();
      await expect(cta).toBeVisible();
      await cta.click();
      const pathByKey: Record<(typeof quickCtaCases)[number], string> = {
        readme: "/readme",
        blog: "/blog",
        "blog-dashboard": "/blog/dashboard",
        game: "/game",
      };
      await expectPath(page, new RegExp(`^/${localeRegex}${escapeRegExp(pathByKey[key])}$`));
      await visit(page, `/${locale}`);
    }
  });

  test("사이드바 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}`);

    const explorerButton = page.getByTestId("app-sidebar-trigger-explorer");
    const searchButton = page.getByTestId("app-sidebar-trigger-search");

    await expect(explorerButton).toBeVisible();
    await expect(searchButton).toBeVisible();

    await explorerButton.click();
    await expect(page.getByTestId("app-sidebar-content")).toBeVisible();

    const sidebarContent = page.getByTestId("app-sidebar-content");
    await sidebarContent.getByText("README.md", { exact: true }).click();
    await expectPath(page, new RegExp(`^/${escapeRegExp(locale)}/readme$`));

    await visit(page, `/${locale}`);
    await explorerButton.click();
    await sidebarContent.getByText("package.json", { exact: true }).click();
    await expectPath(page, new RegExp(`^/${escapeRegExp(locale)}/package$`));

    await visit(page, `/${locale}`);
    await searchButton.click();

    const searchInput = page.getByTestId("blog-dashboard-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("game");

    const suggestionItems = sidebarContent.getByTestId(/^app-sidebar-search-result-/);
    await expect(suggestionItems.first()).toBeVisible();

    const gameSuggestionItems = suggestionItems.filter({ hasText: "/game" });
    const pickedSuggestion =
      (await gameSuggestionItems.count()) > 0 ? gameSuggestionItems : suggestionItems;

    const pickedSuggestionPath = (await pickedSuggestion.first().getAttribute("data-path")) ?? "";
    expect(pickedSuggestionPath).toBeTruthy();
    await pickedSuggestion.first().click();
    await expectPath(
      page,
      new RegExp(`^/${escapeRegExp(locale)}${escapeRegExp(pickedSuggestionPath)}(?:/)?$`),
    );

    await expect(page.locator("#menubar")).toBeVisible();
  });

  test("README/Resume CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    await visit(page, `/${locale}/readme`);

    await expect(
      page.getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.Share.share)}$`) }),
    ).toBeVisible();
    await openQrDialogAndCopy(page, page, messages.Share.copyLink);

    const mailLink = page.locator('a[href^="mailto:"]');
    const telLink = page.locator('a[href^="tel:"]');
    await expect(mailLink).toHaveCount(1);
    await expect(telLink).toHaveCount(1);
    await expect(page.locator('a[href="https://github.com/icecokel"]')).toBeVisible();
    await expect(page.locator('a[href="https://icecokel.tistory.com"]')).toBeVisible();

    const phoneRow = page
      .locator('a[href^="tel:"]')
      .first()
      .locator("xpath=ancestor::div[contains(@class,'flex items-center gap-2')][1]");
    const copyPhoneButton = phoneRow.locator("button");
    await expect(copyPhoneButton).toHaveCount(1);
    await copyPhoneButton.click();

    const resumeCta = page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(messages.resume.viewDescription)}$`),
    });
    expect(await resumeCta.count()).toBeGreaterThan(0);

    await resumeCta.first().click();
    await expectPath(page, new RegExp(`^/${localeRegex}/resume/[^/]+$`));

    await expect(
      page.getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.Share.share)}$`) }),
    ).toBeVisible();
    await openQrDialogAndCopy(page, page, messages.Share.copyLink);

    await page
      .getByRole("link", { name: new RegExp(escapeRegExp(messages.resume.backToResume)) })
      .first()
      .click();
    await expectPath(page, new RegExp(`^/${localeRegex}/readme$`));
  });

  test("블로그 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    await visit(page, `/${locale}/blog`);

    await expect(
      page.getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.Share.share)}$`) }),
    ).toBeVisible();
    await openQrDialogAndCopy(page, page, messages.Share.copyLink);

    const postLinks = page.locator(`a[href^='/${locale}/blog/']`);
    const postLinkCount = await postLinks.count();
    expect(postLinkCount).toBeGreaterThan(5);

    for (let index = 0; index < postLinkCount; index += 1) {
      const href = await postLinks.nth(index).getAttribute("href");
      expect(href).toMatch(new RegExp(`^/${localeRegex}/blog/.+`));
    }

    await postLinks.first().click();
    await expectPath(page, new RegExp(`^/${localeRegex}/blog/.+`));

    await expect(
      page.getByRole("link", { name: new RegExp(escapeRegExp(messages.blog.backToList)) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.Share.share)}$`) }),
    ).toBeVisible();
    await openQrDialogAndCopy(page, page, messages.Share.copyLink);

    const copyCodeButton = page.getByRole("button", { name: /copy code/i });
    if ((await copyCodeButton.count()) > 0) {
      await copyCodeButton.first().click();
    }

    await page
      .getByRole("link", { name: new RegExp(escapeRegExp(messages.blog.backToList)) })
      .first()
      .click();
    await expectPath(page, new RegExp(`^/${localeRegex}/blog$`));
  });

  test("블로그 대시보드 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}/blog/dashboard`);

    const searchInput = page.getByTestId("blog-dashboard-search-input");
    await expect(searchInput).toBeVisible();

    const allCards = page.locator("article");
    const allCardCount = await allCards.count();
    expect(allCardCount).toBeGreaterThan(5);

    const firstTitle = (await allCards.first().locator("h5").textContent())?.trim();
    expect(firstTitle).toBeTruthy();

    await searchInput.fill(firstTitle!);
    await expect(page.getByText(firstTitle!)).toBeVisible();

    const suggestionItems = page.locator("li[data-testid='blog-dashboard-search-suggestion']");
    await suggestionItems
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});

    let pickedSuggestion = "";
    if ((await suggestionItems.count()) > 0) {
      pickedSuggestion = (await suggestionItems.first().innerText()).trim();
      await suggestionItems.first().click();
      await expect(searchInput).toHaveValue(pickedSuggestion);
    } else {
      await allCards.first().click();
    }

    if (pickedSuggestion) {
      await expect(searchInput).toHaveValue(pickedSuggestion);
    }
    await expect(searchInput).toHaveValue(pickedSuggestion);

    const filteredCount = await allCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(allCardCount);

    await searchInput.fill("");
    await expect(suggestionItems).toBeHidden();
    await expect(allCards).toHaveCount(allCardCount);
  });

  test("게임 섹션 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    await visit(page, `/${locale}/game`);

    await expect(page.locator('[data-testid="game-dashboard-title"]')).toBeVisible();
    const mainButtonCount = await page.locator("main button").count();
    expect(mainButtonCount).toBeGreaterThanOrEqual(4);

    await expect(page.getByTestId("game-dashboard-card-sky-drop")).toBeVisible();
    await expect(page.getByTestId("game-dashboard-card-fish-drift")).toBeVisible();
    await expect(page.getByTestId("game-dashboard-card-doom")).toBeVisible();
    await expect(page.getByTestId("game-dashboard-card-wordle")).toBeVisible();

    await page.getByTestId("game-dashboard-card-sky-drop").first().click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game/sky-drop$`));
    const skyDropStart = page.getByTestId("game-start-button");
    const skyDropExit = page.getByTestId("game-exit-button");
    await expect(skyDropStart).toBeVisible({ timeout: 20000 });
    await expect(skyDropExit).toBeVisible();
    await skyDropExit.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));

    await page.getByTestId("game-dashboard-card-fish-drift").click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game/fish-drift$`));

    const fishStart = page.getByTestId("game-start-button-fish-drift");
    await expect(fishStart).toBeVisible();
    await expect.poll(() => fishStart.isEnabled(), { timeout: 20000 }).toBe(true);

    const fishExit = page.getByTestId("game-exit-button-fish-drift");
    await fishExit.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));

    await page.getByTestId("game-dashboard-card-doom").click();
    await expectPath(page, new RegExp(`^/${localeRegex}/doom$`));

    const muteToggle = page
      .getByRole("button", {
        name: new RegExp(
          `${escapeRegExp(messages.Doom.soundOn)}|${escapeRegExp(messages.Doom.soundOff)}`,
        ),
      })
      .first();
    await expect(muteToggle).toBeVisible();
    const beforeMuteLabel = (await muteToggle.textContent())?.trim();
    await muteToggle.click();
    const afterMuteLabel = (await muteToggle.textContent())?.trim();
    expect(afterMuteLabel).not.toBe(beforeMuteLabel);

    await expect(
      page.getByRole("button", {
        name: new RegExp(
          `${escapeRegExp(messages.Doom.buttonLoading)}|${escapeRegExp(messages.Doom.buttonStart)}`,
        ),
      }),
    ).toBeVisible();

    await visit(page, `/${locale}/game`);
    await page.getByTestId("game-dashboard-card-wordle").click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game/wordle$`));

    await expect(page.getByTestId("share-link-button")).toBeVisible();
    await expect(page.getByTestId("wordle-header-restart")).toBeVisible();

    const keyboardButtons = page.locator("footer button");
    await expectWordleKeyboardButtons(page);
    await keyboardButtons.nth(10).click();
    await keyboardButtons.nth(19).click();
    await keyboardButtons.nth(27).click();
  });
});
