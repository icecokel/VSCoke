import assert from "node:assert/strict";
import { test } from "node:test";

import { checkApiHealth, validateOpenApiPaths } from "./api-health-checker.mjs";

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
