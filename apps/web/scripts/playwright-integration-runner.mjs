import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webRoot, "../..");
const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for integrated web E2E");
}

const parsedDatabaseUrl = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\/+|\/+$/g, ""));

if (!databaseName.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL database name must end in _test");
}

const apiPort = String(46000 + (process.pid % 1000));
const webPort = String(47000 + (process.pid % 1000));
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const seedEnv = {
  ...process.env,
  TEST_DATABASE_URL: testDatabaseUrl,
};
delete seedEnv.DB_DATABASE;

const integrationEnv = {
  ...process.env,
  CORS_ORIGINS: webUrl,
  DB_DATABASE: databaseName,
  DB_HOST: parsedDatabaseUrl.hostname,
  DB_PASSWORD: decodeURIComponent(parsedDatabaseUrl.password),
  DB_PORT: parsedDatabaseUrl.port || "5432",
  DB_SYNCHRONIZE: "false",
  DB_USERNAME: decodeURIComponent(parsedDatabaseUrl.username),
  NEXT_PUBLIC_API_URL: apiUrl,
  NODE_ENV: "test",
  PLAYWRIGHT_PORT: webPort,
  PORT: apiPort,
  TEST_DATABASE_URL: testDatabaseUrl,
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: integrationEnv,
      stdio: "inherit",
      ...options,
    });

    child.once("error", reject);
    child.once("exit", code => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });

const waitForApi = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 120_000) {
    try {
      const response = await fetch(`${apiUrl}/health`);
      if (response.ok) return;
    } catch {}

    await new Promise(resolvePromise => setTimeout(resolvePromise, 500));
  }

  throw new Error(`Timed out waiting for integrated API at ${apiUrl}`);
};

const stopProcessGroup = child => {
  if (!child || child.exitCode !== null) return;

  if (process.platform === "win32") {
    child.kill("SIGTERM");
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
};

let apiProcess;

try {
  await runCommand(pnpmCommand, ["--filter", "@vscoke/api", "e2e:seed:hobby"], {
    env: seedEnv,
  });

  apiProcess = spawn(pnpmCommand, ["--filter", "@vscoke/api", "start"], {
    cwd: repositoryRoot,
    detached: process.platform !== "win32",
    env: integrationEnv,
    stdio: "inherit",
  });

  await waitForApi();
  await runCommand(
    process.execPath,
    [
      "scripts/playwright-runner.mjs",
      "test",
      "tests/e2e/hobby-espresso.spec.ts",
      "tests/e2e/hobby-recipes.spec.ts",
      "--project=chromium",
    ],
    { cwd: webRoot },
  );
} finally {
  stopProcessGroup(apiProcess);
}
