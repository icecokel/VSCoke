# Layout Shift Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데스크톱 초기 진입에서 발생하는 공통 탭 바, 게임 프레임, Doom 화면의 레이아웃 쉬프트를 제거하고 E2E 회귀 테스트로 고정한다.

**Architecture:** 먼저 Playwright에서 `layout-shift` PerformanceObserver 기반 회귀 테스트를 추가한다. 그 다음 `HistoryTabs`는 첫 렌더부터 탭 바 높이를 예약하고, Phaser 게임 화면은 부모 높이를 기준으로 프레임 치수를 명시적으로 계산하며, Doom 화면은 잘못된 외부 stylesheet 요청을 제거하고 내부 프레임 크기를 고정한다.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, Playwright E2E, Phaser 3.

---

## File Structure

- Create: `apps/web/tests/e2e/layout-shift.spec.ts`
  - 데스크톱 주요 라우트에서 CLS 합산값을 측정하는 회귀 테스트.
- Modify: `apps/web/src/components/history-tabs/history-tabs.tsx`
  - 탭 바 wrapper에 고정 높이와 `data-testid`를 추가해 hydration 후 본문이 32px 밀리지 않게 한다.
- Modify: `apps/web/tests/e2e/history-tabs.spec.ts`
  - 탭 바가 빈 history 상태에서도 32px 높이를 유지하는 회귀 테스트를 추가한다.
- Create: `apps/web/src/components/game/game-frame-style.ts`
  - Sky Drop/Fish Drift 공통 데스크톱 프레임 치수 계산 유틸.
- Modify: `apps/web/src/app/[locale]/game/sky-drop/page.tsx`
  - 공통 프레임 치수 유틸을 사용하고 초기 sizing transition을 제거한다.
- Modify: `apps/web/src/app/[locale]/game/fish-drift/page.tsx`
  - Sky Drop과 같은 방식으로 프레임 치수를 고정한다.
- Modify: `apps/web/src/app/[locale]/doom/page.tsx`
  - nested viewport 높이 과대 사용을 줄이고 Doom frame에 안정적인 테스트 id와 containment를 부여한다.
- Modify: `apps/web/src/components/doom/doom-game.tsx`
  - `https://js-dos.com/6.22/current/js-dos.css` stylesheet 요청을 제거한다. 해당 URL은 2026-07-04 확인 기준 `404 text/html`을 반환한다.

---

### Task 1: Add Layout Shift Regression Spec

**Files:**

- Create: `apps/web/tests/e2e/layout-shift.spec.ts`

- [ ] **Step 1: Write the failing CLS test**

Create `apps/web/tests/e2e/layout-shift.spec.ts` with this content:

```ts
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
```

- [ ] **Step 2: Run the new test and verify it fails before fixes**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/layout-shift.spec.ts --project=chromium
```

Expected result before fixes: FAIL. Current measured desktop values include `/ko-KR` around `0.03`, `/ko-KR/game/sky-drop` around `0.06`, `/ko-KR/game/fish-drift` around `0.06`, and `/ko-KR/doom` around `0.10`.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add apps/web/tests/e2e/layout-shift.spec.ts
git commit -m "test(web):레이아웃 쉬프트 회귀 추가"
```

---

### Task 2: Reserve History Tab Rail Height

**Files:**

- Modify: `apps/web/src/components/history-tabs/history-tabs.tsx`
- Modify: `apps/web/tests/e2e/history-tabs.spec.ts`

- [ ] **Step 1: Add a focused history tab rail test**

Append this test inside `test.describe("히스토리 탭 상태머신", () => { ... })` in `apps/web/tests/e2e/history-tabs.spec.ts`:

```ts
test("빈 히스토리 상태에서도 탭 영역 높이를 예약한다", async ({ page }) => {
  await installHistoryFixture(page, []);

  const locale = getTestLocale();
  await visit(page, `/${locale}`);

  const tabRail = page.locator('[data-testid="history-tab-rail"]');
  await expect(tabRail).toBeVisible();
  await expect(tabRail).toHaveCSS("height", "32px");

  await waitForHistoryHydration(page);
  await expect(tabRail).toHaveCSS("height", "32px");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/history-tabs.spec.ts --project=chromium
```

Expected result before implementation: FAIL because `[data-testid="history-tab-rail"]` is not present.

- [ ] **Step 3: Reserve the tab rail height**

In `apps/web/src/components/history-tabs/history-tabs.tsx`, replace the tab rail wrapper:

```tsx
      <div className="flex bg-gray-900 overflow-x-auto flex-shrink-0">
```

with:

```tsx
      <div
        data-testid="history-tab-rail"
        className="flex h-8 min-h-8 flex-shrink-0 overflow-x-auto bg-gray-900"
      >
```

This keeps the content container y-position stable before and after `HistoryProvider` reads `localStorage`.

- [ ] **Step 4: Run history tab tests**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/history-tabs.spec.ts --project=chromium
```

Expected result after implementation: PASS.

- [ ] **Step 5: Run the CLS spec and verify common pages improve**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/layout-shift.spec.ts --project=chromium
```

Expected result at this point: `/ko-KR` and `/ko-KR/readme` pass; game and Doom cases may still fail.

- [ ] **Step 6: Commit the history tab fix**

```bash
git add apps/web/src/components/history-tabs/history-tabs.tsx apps/web/tests/e2e/history-tabs.spec.ts
git commit -m "fix(web):히스토리 탭 높이 예약"
```

---

### Task 3: Stabilize Phaser Game Frame Dimensions

**Files:**

- Create: `apps/web/src/components/game/game-frame-style.ts`
- Modify: `apps/web/src/app/[locale]/game/sky-drop/page.tsx`
- Modify: `apps/web/src/app/[locale]/game/fish-drift/page.tsx`

- [ ] **Step 1: Create the shared desktop frame style helper**

Create `apps/web/src/components/game/game-frame-style.ts`:

```ts
import type { CSSProperties } from "react";

type GameFrameStyle = CSSProperties & {
  "--game-frame-height": string;
  "--game-frame-width": string;
};

interface CreateDesktopGameFrameStyleOptions {
  maxWidth: number;
  aspectRatioCss: `${number}/${number}`;
  verticalGap?: number;
}

export const createDesktopGameFrameStyle = ({
  maxWidth,
  aspectRatioCss,
  verticalGap = 8,
}: CreateDesktopGameFrameStyleOptions): GameFrameStyle => {
  const [widthRatio, heightRatio] = aspectRatioCss.split("/").map(Number);
  const maxHeight = Math.round((maxWidth * heightRatio) / widthRatio);

  return {
    "--game-frame-height": `min(calc(100% - ${verticalGap}px), ${maxHeight}px)`,
    "--game-frame-width": `min(100%, ${maxWidth}px, calc(var(--game-frame-height) * ${widthRatio} / ${heightRatio}))`,
    width: "var(--game-frame-width)",
    height: "var(--game-frame-height)",
    aspectRatio: aspectRatioCss,
  };
};
```

- [ ] **Step 2: Update Sky Drop to use explicit frame dimensions**

In `apps/web/src/app/[locale]/game/sky-drop/page.tsx`, add:

```tsx
import { createDesktopGameFrameStyle } from "@/components/game/game-frame-style";
```

Replace the desktop branch of `containerStyle`:

```tsx
    : {
        maxWidth: `${GameConstants.MAX_WIDTH}px`,
        maxHeight: "calc(100% - 8px)",
        aspectRatio: GameConstants.ASPECT_RATIO_CSS,
      };
```

with:

```tsx
    : createDesktopGameFrameStyle({
        maxWidth: GameConstants.MAX_WIDTH,
        aspectRatioCss: GameConstants.ASPECT_RATIO_CSS,
      });
```

Replace the container class:

```tsx
        className={`relative overflow-hidden bg-black shadow-2xl transition-all duration-300 ${!isMobile ? "w-full rounded-xl border-0 border-slate-700 sm:border-4" : ""}`}
```

with:

```tsx
        className={`relative overflow-hidden bg-black shadow-2xl ${!isMobile ? "rounded-xl border-0 border-slate-700 sm:border-4" : ""}`}
```

- [ ] **Step 3: Update Fish Drift to use explicit frame dimensions**

In `apps/web/src/app/[locale]/game/fish-drift/page.tsx`, add:

```tsx
import { createDesktopGameFrameStyle } from "@/components/game/game-frame-style";
```

Replace the desktop branch of `containerStyle`:

```tsx
    : {
        maxWidth: `${FishDriftConstants.MAX_WIDTH}px`,
        maxHeight: "calc(100% - 8px)",
        aspectRatio: FishDriftConstants.ASPECT_RATIO_CSS,
      };
```

with:

```tsx
    : createDesktopGameFrameStyle({
        maxWidth: FishDriftConstants.MAX_WIDTH,
        aspectRatioCss: FishDriftConstants.ASPECT_RATIO_CSS,
      });
```

Replace the container class:

```tsx
        className={`relative overflow-hidden bg-sky-950 shadow-2xl transition-all duration-300 ${!isMobile ? "w-full rounded-xl border-0 border-cyan-900 sm:border-4" : ""}`}
```

with:

```tsx
        className={`relative overflow-hidden bg-sky-950 shadow-2xl ${!isMobile ? "rounded-xl border-0 border-cyan-900 sm:border-4" : ""}`}
```

- [ ] **Step 4: Run typecheck**

Run from repository root:

```bash
corepack pnpm --filter @vscoke/web type:check
```

Expected result: PASS.

- [ ] **Step 5: Run game CLS cases**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/layout-shift.spec.ts --project=chromium --grep "sky-drop|fish-drift"
```

Expected result after implementation: PASS.

- [ ] **Step 6: Commit the game frame fix**

```bash
git add apps/web/src/components/game/game-frame-style.ts apps/web/src/app/[locale]/game/sky-drop/page.tsx apps/web/src/app/[locale]/game/fish-drift/page.tsx
git commit -m "fix(game):게임 프레임 치수 고정"
```

---

### Task 4: Stabilize Doom Initial Layout

**Files:**

- Modify: `apps/web/src/app/[locale]/doom/page.tsx`
- Modify: `apps/web/src/components/doom/doom-game.tsx`

- [ ] **Step 1: Remove the invalid js-dos stylesheet request**

In `apps/web/src/components/doom/doom-game.tsx`, delete this line:

```tsx
<link rel="stylesheet" href="https://js-dos.com/6.22/current/js-dos.css" />
```

Keep the script line:

```tsx
<Script src="https://js-dos.com/6.22/current/js-dos.js" onLoad={() => setIsReady(true)} />
```

Reason: `https://js-dos.com/6.22/current/js-dos.css` returns `404` with `content-type: text/html; charset=utf-8`, so it is not a valid stylesheet for this page.

- [ ] **Step 2: Change Doom page height and frame containment**

In `apps/web/src/app/[locale]/doom/page.tsx`, replace:

```tsx
    <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full space-y-6">
```

with:

```tsx
    <div className="flex min-h-full w-full flex-col items-center justify-center bg-black p-4">
      <div data-testid="doom-layout" className="w-full max-w-5xl space-y-6">
```

Then replace:

```tsx
        <main className="w-full aspect-[4/3] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl shadow-red-900/20 border border-zinc-800 relative">
```

with:

```tsx
        <main
          data-testid="doom-frame"
          className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-red-900/20"
          style={{ contain: "layout paint" }}
        >
```

- [ ] **Step 3: Run Doom CLS case**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/layout-shift.spec.ts --project=chromium --grep "/ko-KR/doom"
```

Expected result after implementation: PASS.

- [ ] **Step 4: Commit the Doom fix**

```bash
git add apps/web/src/app/[locale]/doom/page.tsx apps/web/src/components/doom/doom-game.tsx
git commit -m "fix(doom):초기 레이아웃 고정"
```

---

### Task 5: Final Verification

**Files:**

- Verify only; no new files.

- [ ] **Step 1: Run focused E2E regression tests**

Run from `apps/web`:

```bash
corepack pnpm e2e tests/e2e/layout-shift.spec.ts tests/e2e/history-tabs.spec.ts --project=chromium
```

Expected result: PASS.

- [ ] **Step 2: Run web typecheck and lint**

Run from repository root:

```bash
corepack pnpm --filter @vscoke/web type:check
corepack pnpm --filter @vscoke/web lint
```

Expected result: both PASS.

- [ ] **Step 3: Run production build**

Run from repository root:

```bash
AUTH_SECRET=e2e-auth-secret \
AUTH_URL=http://127.0.0.1:3000 \
NEXTAUTH_SECRET=e2e-auth-secret \
NEXTAUTH_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 \
corepack pnpm --filter @vscoke/web build
```

Expected result: PASS. API fallback warnings for hobby data are acceptable when `NEXT_PUBLIC_API_URL` points to `127.0.0.1:65535`.

- [ ] **Step 4: Re-measure production CLS manually**

Run from repository root:

```bash
AUTH_SECRET=e2e-auth-secret \
AUTH_URL=http://127.0.0.1:3000 \
NEXTAUTH_SECRET=e2e-auth-secret \
NEXTAUTH_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 \
corepack pnpm --filter @vscoke/web start
```

In another terminal, run from `apps/web`:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
corepack pnpm e2e tests/e2e/layout-shift.spec.ts --project=chromium
```

Expected result: PASS against production server.

- [ ] **Step 5: Commit final verification note if only metadata changed**

If no files changed during verification, skip this step. If snapshots or test metadata are intentionally updated, commit them with:

```bash
git add apps/web/tests/e2e
git commit -m "test(web):레이아웃 검증 정리"
```

---

## Self-Review

- Spec coverage: 공통 `HistoryTabs` shift, Sky Drop/Fish Drift frame shift, Doom 초기 layout shift, production measurement 재검증을 모두 포함한다.
- Placeholder scan: 계획 안에 미정 항목 없이 경로, 코드, 명령, 기대 결과를 명시했다.
- Type consistency: 새 helper 이름은 `createDesktopGameFrameStyle`로 고정하고 두 게임 페이지가 같은 import를 사용한다. 새 테스트 전역 필드는 `window.__vscokeLayoutShifts` 하나만 사용한다.
