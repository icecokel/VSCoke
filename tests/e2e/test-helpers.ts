import fs from "node:fs";
import path from "node:path";
import { expect, Page } from "@playwright/test";

export type Locale = "ko-KR" | "en-US";

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

export const expectPath = async (page: Page, regex: RegExp) => {
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toMatch(regex);
};

export const resolveLocaleAndMessages = async (page: Page) => {
  const tryLocale = async (routePath: string) => {
    const localeResponse = await gotoWithRetry(page, routePath, 4, false);
    const localeMatch = new URL(page.url()).pathname.match(LOCALE_PATH_REGEX);
    const status = localeResponse?.status() ?? 500;

    if (status < 400 && localeMatch) {
      return { locale: localeMatch[1] as Locale, response: localeResponse };
    }

    return undefined;
  };

  let result = await tryLocale("/");
  if (!result) {
    result = await tryLocale("/ko-KR");
  }
  if (!result) {
    result = await tryLocale("/en-US");
  }

  expect(result).toBeTruthy();
  const { locale, response } = result!;

  expect(response?.status(), `${response?.url()} 응답 상태가 비정상입니다.`).toBeLessThan(400);
  const match = new URL(response!.url()).pathname.match(LOCALE_PATH_REGEX);
  expect(match).toBeTruthy();
  expect(match![1]).toBe(locale);

  return { locale, messages: loadMessages(locale) };
};

export const gotoWithRetry = async (page: Page, routePath: string, attempts = 4, strict = true) => {
  let latest = await page.goto(routePath);

  for (let attempt = 1; attempt < attempts && (latest?.status() ?? 500) >= 400; attempt += 1) {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    latest = await page.goto(routePath);
  }

  if (strict) {
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
  const stack = [postsRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".mdx")) {
        continue;
      }

      const relative = path.relative(postsRoot, absolutePath).replace(/\\/g, "/");
      return relative.replace(/\.mdx$/, "");
    }
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
