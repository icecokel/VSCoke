import { expect, Page, test } from "@playwright/test";

const LOCALE_PATH_REGEX = /\/(ko-KR|en-US)(?=\/|$)/;

const resolveLocale = async (page: Page) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);

  const match = new URL(page.url()).pathname.match(LOCALE_PATH_REGEX);
  expect(match).toBeTruthy();
  return match![1];
};

const getSidebarWidthRem = async (page: Page) => {
  return page.evaluate(() => {
    const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement | null;
    if (!wrapper) {
      throw new Error("sidebar wrapper not found");
    }

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const rawWidth = getComputedStyle(wrapper).getPropertyValue("--sidebar-width").trim();
    const fallbackWidth = "16rem";

    const parseLengthToPx = (value: string) => {
      if (!value) return null;

      const normalized = value.trim();
      if (normalized.endsWith("rem")) {
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed * rootFontSize : null;
      }
      if (normalized.endsWith("px")) {
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
      }

      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const widthPx =
      parseLengthToPx(rawWidth) ?? parseLengthToPx(fallbackWidth) ?? rootFontSize * 16;
    return widthPx / rootFontSize;
  });
};

test.describe("사이드바 리사이즈 접근성", () => {
  test("리사이즈 핸들이 키보드로 동작하고 ARIA 상태를 제공한다", async ({ page }) => {
    const locale = await resolveLocale(page);
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBeLessThan(400);

    const explorerToggle = page.getByTestId("app-sidebar-trigger-explorer");
    await explorerToggle.click();
    await expect(page.locator('[data-slot="sidebar"]').first()).toHaveAttribute(
      "data-state",
      "expanded",
    );

    const rail = page.getByRole("separator", { name: "Resize Sidebar" });
    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute("aria-orientation", "vertical");
    await expect(rail).toHaveAttribute("aria-valuemin", /.+/);
    await expect(rail).toHaveAttribute("aria-valuemax", /.+/);
    await expect(rail).toHaveAttribute("aria-valuenow", /.+/);

    await rail.focus();
    await expect(rail).toBeFocused();

    const initialWidth = await getSidebarWidthRem(page);
    await rail.press("ArrowRight");
    const increasedWidth = await getSidebarWidthRem(page);
    expect(increasedWidth).toBeGreaterThan(initialWidth);

    await rail.press("ArrowLeft");
    const decreasedWidth = await getSidebarWidthRem(page);
    expect(decreasedWidth).toBeLessThan(increasedWidth);

    await rail.press("End");
    const maxWidth = await getSidebarWidthRem(page);
    await rail.press("Home");
    const minWidth = await getSidebarWidthRem(page);
    expect(maxWidth).toBeGreaterThan(minWidth);

    await rail.press("Space");
    const resetWidth = await getSidebarWidthRem(page);
    expect(Math.abs(resetWidth - 16)).toBeLessThanOrEqual(0.2);

    const ariaValueNow = Number(await rail.getAttribute("aria-valuenow"));
    expect(Number.isFinite(ariaValueNow)).toBeTruthy();
  });
});
