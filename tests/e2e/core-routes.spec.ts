import { expect, Locator, Page, test } from "@playwright/test";
import {
  escapeRegExp,
  expectPath,
  expectWordleKeyboardButtons,
  resolveLocaleAndMessages,
  visit,
} from "./test-helpers";

const openQrDialogAndCopy = async (
  page: Page,
  scope: Page | Locator,
  qrLabel: string,
  copyLabel: string,
) => {
  await scope
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(qrLabel)}$`) })
    .first()
    .click();

  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(copyLabel)}$`) })
    .first()
    .click();

  const closeButton = dialog.getByRole("button", { name: /close/i });
  if ((await closeButton.count()) > 0) {
    await closeButton.first().click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(dialog).toBeHidden();
};

test.describe.configure({ mode: "serial" });

test.describe("코어 라우트 CTA 시나리오", () => {
  test("메뉴바 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}`);

    const menuBar = page.locator("#menubar");
    await expect(menuBar).toBeVisible();

    await menuBar.getByText(messages.menu.file, { exact: true }).click();
    await page
      .getByRole("menuitem", { name: new RegExp(`^${escapeRegExp(messages.menu.openProject)}$`) })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const visibleButtons = dialog.locator("button:visible");
    expect(await visibleButtons.count()).toBeGreaterThanOrEqual(8);

    const cancelButton = dialog.getByRole("button", { name: /취소|Cancel/ }).first();
    const openButton = dialog.getByRole("button", { name: /열기|Open/ }).first();

    await expect(openButton).toBeDisabled();
    await dialog.getByRole("button", { name: "Portfolio" }).first().click();
    await dialog.getByRole("button", { name: "VSCOKE" }).first().click();
    await expect(openButton).toBeEnabled();
    await cancelButton.click();
    await expect(dialog).toBeHidden();

    await menuBar.getByText(messages.menu.language, { exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "English" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "한국어" })).toBeVisible();
    await page.keyboard.press("Escape");

    await menuBar.getByText(messages.menu.help, { exact: true }).click({ force: true });
    await expect(
      page.getByRole("menuitem", { name: new RegExp(escapeRegExp(messages.menu.preparing)) }),
    ).toBeVisible();
  });

  test("홈 CTA 6개 전체 경로 검증", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    await visit(page, `/${locale}`);

    const heroSection = page.locator("section").filter({ has: page.getByText("VSCOKE HUB") });
    await expect(heroSection).toHaveCount(1);

    const primaryCta = heroSection.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(messages.home.primaryCta)}$`),
    });
    const secondaryCta = heroSection.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(messages.home.secondaryCta)}$`),
    });

    await expect(primaryCta).toBeVisible();
    await expect(secondaryCta).toBeVisible();

    await primaryCta.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/readme$`));
    await visit(page, `/${locale}`);

    await secondaryCta.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));
    await visit(page, `/${locale}`);

    const quickLaunchGrid = page.locator(
      "section div.grid.grid-cols-1.gap-3.sm\\:grid-cols-2.lg\\:grid-cols-4",
    );
    await expect(quickLaunchGrid).toHaveCount(1);
    await expect(quickLaunchGrid.locator("button")).toHaveCount(4);

    const quickCtaCases: Array<{ title: string; path: string }> = [
      { title: messages.home.cards.readmeTitle, path: "/readme" },
      { title: messages.home.cards.blogTitle, path: "/blog" },
      { title: messages.home.cards.blogDashboardTitle, path: "/blog/dashboard" },
      { title: messages.home.cards.gameTitle, path: "/game" },
    ];

    for (const testCase of quickCtaCases) {
      const cta = quickLaunchGrid
        .getByRole("button", { name: new RegExp(escapeRegExp(testCase.title)) })
        .first();
      await expect(cta).toBeVisible();
      await cta.click();
      await expectPath(page, new RegExp(`^/${localeRegex}${escapeRegExp(testCase.path)}$`));
      await visit(page, `/${locale}`);
    }
  });

  test("사이드바 CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}`);

    const explorerButton = page
      .getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.sidebar.explorer)}$`) })
      .first();
    const searchButton = page
      .getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.sidebar.search)}$`) })
      .first();

    await expect(explorerButton).toBeVisible();
    await expect(searchButton).toBeVisible();

    await explorerButton.click();
    await expect(page.locator("[data-slot='sidebar-content']")).toBeVisible();

    const sidebarContent = page.locator("[data-slot='sidebar-content']").first();
    await sidebarContent.getByText("README.md", { exact: true }).click();
    await expectPath(page, new RegExp(`^/${escapeRegExp(locale)}/readme$`));

    await visit(page, `/${locale}`);
    await explorerButton.click();
    await sidebarContent.getByText("package.json", { exact: true }).click();
    await expectPath(page, new RegExp(`^/${escapeRegExp(locale)}/package$`));

    await visit(page, `/${locale}`);
    await searchButton.click();

    const searchInput = page.getByPlaceholder(messages.sidebar.searchPlaceholder);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("game");

    const searchResultButtons = page.locator("[data-slot='sidebar-content'] li > button");
    await expect(searchResultButtons.first()).toBeVisible();

    const beforePath = new URL(page.url()).pathname;
    await searchResultButtons.first().click();
    await expect.poll(() => new URL(page.url()).pathname).not.toBe(beforePath);
  });

  test("README/Resume CTA 전체 동작", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    await visit(page, `/${locale}/readme`);

    await expect(
      page.getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.Share.share)}$`) }),
    ).toBeVisible();
    await openQrDialogAndCopy(page, page, messages.Share.qr, messages.Share.copyLink);

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
    await openQrDialogAndCopy(page, page, messages.Share.qr, messages.Share.copyLink);

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
    await openQrDialogAndCopy(page, page, messages.Share.qr, messages.Share.copyLink);

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
    await openQrDialogAndCopy(page, page, messages.Share.qr, messages.Share.copyLink);

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
    const { locale } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}/blog/dashboard`);

    const searchInput = page.getByPlaceholder("제목으로 검색...");
    await expect(searchInput).toBeVisible();

    const allCards = page.locator("article");
    const allCardCount = await allCards.count();
    expect(allCardCount).toBeGreaterThan(5);

    const firstTitle = (await allCards.first().locator("h5").textContent())?.trim();
    expect(firstTitle).toBeTruthy();

    await searchInput.fill(firstTitle!);
    await expect(page.getByText(firstTitle!)).toBeVisible();

    const suggestionItems = searchInput.locator("xpath=ancestor::div[1]/ul/li");
    await expect(suggestionItems.first()).toBeVisible();

    const pickedSuggestion = (await suggestionItems.first().innerText()).trim();
    await suggestionItems.first().click();
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

    await expect(page.getByRole("heading", { name: messages.home.cards.gameTitle })).toBeVisible();
    await expect(page.locator("main button")).toHaveCount(4);

    await expect(page.getByRole("button", { name: /Sky Drop/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fish Drift/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.doomTitle)) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.wordleTitle)) }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Sky Drop/i })
      .first()
      .click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game/sky-drop$`));
    const skyDropStart = page.getByRole("button", { name: /Start Game/i });
    const skyDropExit = page.getByRole("button", { name: /Exit Game/i });
    await expect(skyDropStart).toBeVisible({ timeout: 20000 });
    await expect(skyDropExit).toBeVisible();
    await skyDropExit.click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));

    await page.getByRole("button", { name: /Fish Drift/ }).click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game/fish-drift$`));

    const fishStart = page
      .locator("button", { hasText: new RegExp(`^${escapeRegExp(messages.Game.start)}$`) })
      .first();
    await expect(fishStart).toBeVisible();
    await expect.poll(() => fishStart.isEnabled(), { timeout: 20000 }).toBe(true);

    await page
      .locator("button", { hasText: new RegExp(`^${escapeRegExp(messages.Game.exit)}$`) })
      .first()
      .click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));

    await page
      .getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.doomTitle)) })
      .click();
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
    await page
      .getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.wordleTitle)) })
      .click();
    await expectPath(page, new RegExp(`^/${localeRegex}/game/wordle$`));

    await expect(
      page.getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.Share.share)}$`) }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Restart Game" })).toBeVisible();

    const keyboardButtons = page.locator("footer button");
    await expectWordleKeyboardButtons(page);
    await keyboardButtons.nth(10).click();
    await keyboardButtons.nth(19).click();
    await keyboardButtons.nth(27).click();
  });
});
