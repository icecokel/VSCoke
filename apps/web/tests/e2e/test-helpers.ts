import fs from "node:fs";
import { randomUUID } from "node:crypto";
import type { Route } from "@playwright/test";
import path from "node:path";
import { expect, Page } from "@playwright/test";

export const SUPPORTED_LOCALES = ["ko-KR", "en-US", "ja-JP"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_PLAYWRIGHT_LOCALE: Locale = "ko-KR";

export interface AppMessages {
  common: {
    korean: string;
    english: string;
    japanese: string;
  };
  menu: {
    file: string;
    openProject: string;
    language: string;
    help: string;
    preparing: string;
    cancel: string;
    open: string;
  };
  home: {
    primaryCta: string;
    secondaryCta: string;
    cards: {
      readmeTitle: string;
      blogDashboardTitle: string;
      gameTitle: string;
    };
  };
  historyTabs: {
    close: string;
    closeOthers: string;
    closeAll: string;
  };
  notFound: {
    title: string;
    descPrefix: string;
    descSuffix: string;
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
    apiUnavailable: string;
    leaderboardEmpty: string;
    loadFailed: string;
    resultNotFoundTitle: string;
    notEnoughLetters: string;
    wordleTitle: string;
  };
  blog: {
    backToList: string;
  };
  profile: {
    proposal: string;
    sendEmail: string;
    call: string;
  };
  resume: {
    viewDescription: string;
    backToResume: string;
    links: string[];
  };
}

export const LOCALE_PATH_REGEX = /\/(ko-KR|en-US|ja-JP)(?=\/|$)/;

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
  return "journal/hello-world";
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

export const waitForHistoryPaths = async (page: Page, expectedPathSuffixes: string[]) => {
  await expect
    .poll(async () => {
      const current = await getHistorySnapshot(page);
      const paths = current.map((item: { path: string }) => item.path);

      return expectedPathSuffixes.every(expectedPath =>
        paths.some((pathValue: string) => pathValue.endsWith(expectedPath)),
      );
    })
    .toBe(true);
};

export const expectWordleKeyboardButtons = async (page: Page, minimum = 20) => {
  const keyboardButtons = page.locator("footer button");

  await expect(keyboardButtons.first()).toBeVisible();

  await expect
    .poll(async () => keyboardButtons.count(), { timeout: 8000 })
    .toBeGreaterThanOrEqual(minimum);
};

export const mockWordleWord = async (page: Page, word = "apple") => {
  let requestCount = 0;

  await page.route("**/wordle/word", async route => {
    requestCount += 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { word } }),
    });
  });

  return {
    getRequestCount: () => requestCount,
  };
};

export const conversationResponse = (
  route: Route,
): { conversationId: string; requestId: string } => {
  const request = route.request().postDataJSON() as { conversationId: string; requestId: string };
  return { conversationId: request.conversationId, requestId: request.requestId };
};

export type MockResumeTurn = {
  id: string;
  requestId: string;
  question: string;
  answer: string;
  grounded: boolean;
  sources: [];
  createdAt: string;
};

export const mockResumeConversationStorage = async (page: Page) => {
  const conversations = new Map<
    string,
    {
      id: string;
      token: string;
      channel: string;
      locale: string;
      expiresAt: string;
      turns: MockResumeTurn[];
    }
  >();
  const deleted: string[] = [];
  const restored: string[] = [];
  await page.route("**/resume-rag/conversations**", async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "POST" && pathname.endsWith("/conversations")) {
      const input = request.postDataJSON() as { channel: string; locale: string };
      const access = {
        id: randomUUID(),
        token: "a".repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      };
      conversations.set(access.id, { ...access, ...input, turns: [] });
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: access }),
      });
      return;
    }
    const id = pathname.split("/").at(-1) ?? "";
    const conversation = conversations.get(id);
    if (!conversation || request.headers()["x-resume-conversation-token"] !== conversation.token) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Conversation not found" }),
      });
      return;
    }
    if (request.method() === "DELETE") {
      conversations.delete(id);
      deleted.push(id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { deleted: true } }),
      });
      return;
    }
    restored.push(id);
    const { token: omitted, ...history } = conversation;
    void omitted;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: history }),
    });
  });
  return { conversations, deleted, restored };
};
