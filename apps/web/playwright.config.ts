import { defineConfig, devices } from "@playwright/test";

const defaultPlaywrightPort = 37123;
const playwrightPort =
  Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "", 10) || defaultPlaywrightPort;
const playwrightWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? "", 10) || 1;
const enableCrossBrowser = process.env.PLAYWRIGHT_ENABLE_CROSS_BROWSER === "1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${playwrightPort}`;
const configuredRetries = Number.parseInt(process.env.PLAYWRIGHT_RETRIES ?? "", 10);
const mobileTestMatch = /(mobile-behavior|poke-lounge-mobile)\.spec\.ts$/;
const integrationTestMatch = /poke-lounge-five-player-tournament\.spec\.ts$/;
const visualRegressionTestMatch = /visual-regression\.spec\.ts$/;
const playwrightOutputRoot = process.env.PLAYWRIGHT_OUTPUT_DIR ?? "../../output/playwright";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: Number.isFinite(configuredRetries) ? configuredRetries : process.env.CI ? 2 : 0,
  timeout: 60_000,
  workers: process.env.CI ? 1 : playwrightWorkers,
  outputDir: `${playwrightOutputRoot}/test-results`,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: `${playwrightOutputRoot}/html-report` }],
  ],
  expect: {
    toHaveScreenshot: {
      pathTemplate: "tests/e2e/{testFilePath}-snapshots/{arg}{-projectName}{ext}",
    },
  },
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [mobileTestMatch, integrationTestMatch],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(enableCrossBrowser
      ? [
          {
            name: "webkit",
            testIgnore: [mobileTestMatch, integrationTestMatch, visualRegressionTestMatch],
            use: { ...devices["Desktop Safari"] },
          },
          {
            name: "firefox",
            testIgnore: [mobileTestMatch, integrationTestMatch, visualRegressionTestMatch],
            use: { ...devices["Desktop Firefox"] },
          },
        ]
      : []),
    {
      name: "chromium-mobile-sm",
      testMatch: mobileTestMatch,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium" as const,
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
        browserName: "chromium" as const,
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
        browserName: "chromium" as const,
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    ...(enableCrossBrowser
      ? [
          {
            name: "webkit-mobile-sm",
            testMatch: mobileTestMatch,
            use: {
              ...devices["iPhone 13"],
              browserName: "webkit" as const,
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
              browserName: "webkit" as const,
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
              browserName: "webkit" as const,
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
              browserName: "firefox" as const,
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
              browserName: "firefox" as const,
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
              browserName: "firefox" as const,
              viewport: { width: 430, height: 932 },
              isMobile: true,
              hasTouch: true,
              deviceScaleFactor: 2,
            },
          },
          {
            name: "poke-lounge-five-browser-integration",
            testMatch: integrationTestMatch,
            use: { browserName: "chromium" as const },
          },
        ]
      : []),
  ],
});
