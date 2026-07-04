import { expect, test, type Page } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

interface ShiftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ShiftSourceSummary {
  node: string;
  previousRect: ShiftRect | null;
  currentRect: ShiftRect | null;
}

interface LayoutShiftSummary {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
  sources: ShiftSourceSummary[];
}

declare global {
  interface Window {
    __vscokeLayoutShifts?: LayoutShiftSummary[];
  }
}

const installLayoutShiftObserver = async (page: Page) => {
  await page.addInitScript(() => {
    const toRect = (rect: DOMRectReadOnly | undefined): ShiftRect | null =>
      rect
        ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : null;

    const describeNode = (node: Node | undefined): string => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return "unknown";
      }

      const element = node as Element;
      const id = element.id ? `#${element.id}` : "";
      const testId = element.getAttribute("data-testid")
        ? `[data-testid="${element.getAttribute("data-testid")}"]`
        : "";
      return `${element.tagName.toLowerCase()}${id}${testId}`;
    };

    window.__vscokeLayoutShifts = [];

    new PerformanceObserver(list => {
      for (const rawEntry of list.getEntries()) {
        const entry = rawEntry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
          sources?: Array<{
            node?: Node;
            previousRect?: DOMRectReadOnly;
            currentRect?: DOMRectReadOnly;
          }>;
        };

        window.__vscokeLayoutShifts?.push({
          value: Number((entry.value ?? 0).toFixed(6)),
          startTime: Math.round(entry.startTime),
          hadRecentInput: Boolean(entry.hadRecentInput),
          sources: (entry.sources ?? []).slice(0, 5).map(source => ({
            node: describeNode(source.node),
            previousRect: toRect(source.previousRect),
            currentRect: toRect(source.currentRect),
          })),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
};

const mockStableApiReads = async (page: Page) => {
  await page.route("**/game/ranking?**", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  await page.route("**/wordle/word", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { word: "apple" } }),
    });
  });
};

const readCls = async (page: Page) => {
  const shifts = await page.evaluate(() => window.__vscokeLayoutShifts ?? []);
  const unexpected = shifts.filter(entry => !entry.hadRecentInput);

  return {
    value: Number(unexpected.reduce((sum, entry) => sum + entry.value, 0).toFixed(6)),
    shifts: unexpected,
  };
};

const waitForInitialLayoutToSettle = async (page: Page) => {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
};

test.describe("레이아웃 쉬프트 회귀", () => {
  test.use({
    viewport: { width: 1365, height: 900 },
  });

  const cases: Array<{
    path: string;
    maxCls: number;
    assertReady: (page: Page) => Promise<void>;
  }> = [
    {
      path: "/ko-KR",
      maxCls: 0.01,
      assertReady: async page => {
        await expect(page.locator('[data-testid="home-hero"]')).toBeVisible();
      },
    },
    {
      path: "/ko-KR/readme",
      maxCls: 0.01,
      assertReady: async page => {
        await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
      },
    },
    {
      path: "/ko-KR/game/sky-drop",
      maxCls: 0.01,
      assertReady: async page => {
        await expect(page.getByRole("heading", { name: "Sky Drop" })).toBeVisible();
      },
    },
    {
      path: "/ko-KR/game/fish-drift",
      maxCls: 0.01,
      assertReady: async page => {
        await expect(page.getByRole("heading", { name: "Fish Drift" })).toBeVisible();
      },
    },
    {
      path: "/ko-KR/doom",
      maxCls: 0.01,
      assertReady: async page => {
        await expect(page.locator('[data-testid="doom-frame"]')).toBeVisible();
      },
    },
  ];

  for (const pageCase of cases) {
    test(`${pageCase.path} 초기 CLS가 기준 이하이다`, async ({ page }) => {
      await installLayoutShiftObserver(page);
      await mockStableApiReads(page);

      const response = await gotoWithRetry(page, pageCase.path);
      expect(response?.status()).toBeLessThan(400);
      await pageCase.assertReady(page);
      await waitForInitialLayoutToSettle(page);

      const result = await readCls(page);
      expect(result.value, JSON.stringify(result.shifts, null, 2)).toBeLessThanOrEqual(
        pageCase.maxCls,
      );
    });
  }
});
