import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const e2eEnv = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:65535",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-auth-secret",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-auth-secret",
};
const mobileTestMatch = /mobile-behavior\.spec\.ts$/;
const desktopTestMatch = /^(?!.*mobile-behavior\.spec\.ts$).*\.spec\.ts$/;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        env: {
          ...process.env,
          ...e2eEnv,
        },
      },
  projects: [
    {
      name: "chromium",
      testMatch: desktopTestMatch,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testMatch: desktopTestMatch,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox",
      testMatch: desktopTestMatch,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "chromium-mobile-sm",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "chromium-mobile-md",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "chromium-mobile-lg",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "webkit-mobile-sm",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "webkit-mobile-md",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "webkit-mobile-lg",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "firefox-mobile-sm",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "firefox",
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "firefox-mobile-md",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "firefox",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "firefox-mobile-lg",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "firefox",
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
});
