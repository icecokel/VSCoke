import fs from "node:fs";
import path from "node:path";
import { expect, Page } from "@playwright/test";

export type Locale = "ko-KR" | "en-US";
const DEFAULT_PLAYWRIGHT_LOCALE: Locale = "ko-KR";

export interface AppMessages {
  common: {
    korean: string;
    english: string;
  };
  menu: {
    file: string;
    openProject: string;
    language: string;
    help: string;
    preparing: string;
  };
  home: {
    primaryCta: string;
    secondaryCta: string;
    cards: {
      readmeTitle: string;
      blogTitle: string;
      blogDashboardTitle: string;
      gameTitle: string;
    };
  };
  historyTabs: {
    close: string;
    closeOthers: string;
    closeAll: string;
  };
  sidebar: {
    explorer: string;
    search: string;
    searchPlaceholder: string;
  };
  Share: {
    share: string;
    copied: string;
    qr: string;
    copyLink: string;
  };
  Game: {
    start: string;
    exit: string;
    leaderboardEmpty: string;
    loadFailed: string;
    notEnoughLetters: string;
    doomTitle: string;
    wordleTitle: string;
  };
  blog: {
    backToList: string;
  };
  resume: {
    viewDescription: string;
    backToResume: string;
  };
  Doom: {
    soundOn: string;
    soundOff: string;
    buttonLoading: string;
    buttonStart: string;
  };
}

export const LOCALE_PATH_REGEX = /\/(ko-KR|en-US)(?=\/|$)/;

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const loadMessages = (locale: Locale): AppMessages => {
  const filePath = path.join(process.cwd(), "messages", `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as AppMessages;
};

export const expectPath = async (page: Page, regex: RegExp, timeout = 15000) => {
  await expect.poll(() => new URL(page.url()).pathname, { timeout }).toMatch(regex);
};

export const resolveLocaleAndMessages = async (page: Page) => {
  const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? DEFAULT_PLAYWRIGHT_LOCALE;
  const response = await gotoWithRetry(page, `/${locale}`);

  expect(response?.status(), `${response?.url()} 응답 상태가 비정상입니다.`).toBeLessThan(400);
  const match = new URL(response!.url()).pathname.match(LOCALE_PATH_REGEX);
  expect(match).toBeTruthy();
  expect(match![1]).toBe(locale);
  await expect(page.locator("#menubar")).toBeVisible();

  return { locale, messages: loadMessages(locale) };
};

export const gotoWithRetry = async (page: Page, routePath: string, attempts = 4, strict = true) => {
  let latest: Awaited<ReturnType<Page["goto"]>> | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      latest = await page.goto(routePath);
      if ((latest?.status() ?? 500) < 400) {
        break;
      }
    } catch (error) {
      lastError = error;
    }

    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(250 * (attempt + 1));
  }

  if (strict) {
    if (lastError && !latest) {
      throw lastError;
    }
    expect(latest?.status(), `${routePath} 응답 상태가 비정상입니다.`).toBeLessThan(400);
  }
  return latest;
};

export const visit = async (page: Page, routePath: string) => {
  await gotoWithRetry(page, routePath);
  await expect(page.locator("#menubar")).toBeVisible();
};

export const readFirstBlogSlug = (): string => {
  const postsRoot = path.join(process.cwd(), "src", "posts");
  const findFirstPost = (current: string): string | undefined => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        const nestedPost = findFirstPost(absolutePath);
        if (nestedPost) {
          return nestedPost;
        }
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".mdx")) {
        continue;
      }

      const relative = path.relative(postsRoot, absolutePath).replace(/\\/g, "/");
      return relative.replace(/\.mdx$/, "");
    }

    return undefined;
  };

  const firstPost = findFirstPost(postsRoot);
  if (firstPost) {
    return firstPost;
  }

  throw new Error("블로그 포스트를 찾을 수 없습니다.");
};

export const readFirstResumeSlug = (): string => {
  const resumeRoot = path.join(process.cwd(), "resume-detail");
  const files = fs
    .readdirSync(resumeRoot)
    .filter(file => file.endsWith(".mdx"))
    .sort();

  if (files.length === 0) {
    throw new Error("resume-detail 항목을 찾을 수 없습니다.");
  }

  return files[0].replace(/\.mdx$/, "");
};

export const waitForHistoryHydration = async (page: Page) => {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          try {
            const raw = localStorage.getItem("vscoke-history");
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed);
          } catch {
            return false;
          }
        }),
      { timeout: 10000 },
    )
    .toBe(true);
};

export const getHistorySnapshot = async (page: Page) => {
  return page.evaluate(() => {
    const raw = localStorage.getItem("vscoke-history");
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
};

export const expectWordleKeyboardButtons = async (page: Page, minimum = 20) => {
  const keyboardButtons = page.locator("footer button");

  await expect(keyboardButtons.first()).toBeVisible();

  await expect
    .poll(async () => keyboardButtons.count(), { timeout: 8000 })
    .toBeGreaterThanOrEqual(minimum);
};
