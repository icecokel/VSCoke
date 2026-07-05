import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkApiHealth,
  validateHealthResponse,
  validateOpenApiPaths,
} from "./api-health-checker.mjs";

test("validateOpenApiPaths passes when every required path is present", () => {
  const document = {
    paths: {
      "/api-json": {},
      "/espresso-history/beans": {},
      "/recipes": {},
    },
  };

  assert.deepEqual(validateOpenApiPaths(document, ["/espresso-history/beans", "/recipes"]), []);
});

test("validateOpenApiPaths returns missing required paths", () => {
  const document = {
    paths: {
      "/api-json": {},
      "/espresso": {},
    },
  };

  assert.deepEqual(validateOpenApiPaths(document, ["/espresso-history/beans", "/recipes"]), [
    "/espresso-history/beans",
    "/recipes",
  ]);
});

test("validateHealthResponse passes for an ok health payload", () => {
  assert.equal(
    validateHealthResponse({
      status: "ok",
      uptime: 12.3,
      timestamp: "2026-07-05T00:00:00.000Z",
    }),
    undefined,
  );
});

test("validateHealthResponse rejects non-ok health payloads", () => {
  assert.throws(
    () =>
      validateHealthResponse({
        status: "error",
      }),
    /Invalid API health response/,
  );
});

test("checkApiHealth fails when the OpenAPI document is missing required paths", async () => {
  const fetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      paths: {
        "/espresso": {},
      },
    }),
  });

  await assert.rejects(
    () =>
      checkApiHealth({
        healthUrl: "https://api.example.test/api-json",
        requiredPaths: ["/espresso-history/beans"],
        fetcher,
      }),
    /Missing required API paths: \/espresso-history\/beans/,
  );
});

test("checkApiHealth checks concrete endpoints when requested", async () => {
  const requestedUrls = [];
  const fetcher = async url => {
    requestedUrls.push(url);

    if (url.endsWith("/api-json")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          paths: {
            "/espresso-history/beans": {},
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    };
  };

  await checkApiHealth({
    healthUrl: "https://api.example.test/api-json",
    requiredPaths: ["/espresso-history/beans"],
    endpointChecks: ["/espresso-history/beans"],
    fetcher,
  });

  assert.deepEqual(requestedUrls, [
    "https://api.example.test/api-json",
    "https://api.example.test/espresso-history/beans",
  ]);
});

test("checkApiHealth accepts the dedicated health endpoint", async () => {
  const requestedUrls = [];
  const fetcher = async url => {
    requestedUrls.push(url);

    if (url.endsWith("/health")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          uptime: 12.3,
          timestamp: "2026-07-05T00:00:00.000Z",
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    };
  };

  await checkApiHealth({
    healthUrl: "https://api.example.test/health",
    endpointChecks: ["/recipes"],
    fetcher,
  });

  assert.deepEqual(requestedUrls, [
    "https://api.example.test/health",
    "https://api.example.test/recipes",
  ]);
});
