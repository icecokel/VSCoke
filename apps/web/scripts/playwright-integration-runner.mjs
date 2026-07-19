import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertClientEnvironment,
  omitDatabaseEnvironment,
  redactIntegrationLog,
} from "./playwright-integration-environment.mjs";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webRoot, "../..");
const runnerEnvironment = { ...process.env };
const testDatabaseUrl = runnerEnvironment.TEST_DATABASE_URL?.trim();
const requestedArgs = process.argv.slice(2).filter(argument => argument !== "--");

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for Poke Lounge integration E2E");
}

const parsedDatabaseUrl = parseTestDatabaseUrl(testDatabaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1));
const databasePassword = decodeURIComponent(parsedDatabaseUrl.password);
const databaseUsername = decodeURIComponent(parsedDatabaseUrl.username);
assertSeparatedFromRegularDatabase(parsedDatabaseUrl, databaseName);

const apiPort = String(46000 + (process.pid % 1000));
const webPort = String(47000 + (process.pid % 1000));
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const runId =
  runnerEnvironment.POKE_LOUNGE_E2E_RUN_ID ??
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
const runRoot = resolve(repositoryRoot, "output/playwright/poke-lounge-five-player", runId);

mkdirSync(runRoot, { recursive: true });

const nonDatabaseEnvironment = omitDatabaseEnvironment(
  runnerEnvironment,
  [testDatabaseUrl, databasePassword],
  [databaseUsername],
);
const migrationEnvironment = {
  ...nonDatabaseEnvironment,
  TEST_DATABASE_URL: testDatabaseUrl,
};
const apiEnvironment = {
  ...nonDatabaseEnvironment,
  CORS_ORIGINS: webUrl,
  DB_DATABASE: databaseName,
  DB_HOST: parsedDatabaseUrl.hostname,
  DB_PASSWORD: databasePassword,
  DB_PORT: parsedDatabaseUrl.port || "5432",
  DB_SYNCHRONIZE: "false",
  DB_USERNAME: databaseUsername,
  NODE_ENV: "test",
  POKE_LOUNGE_E2E: "1",
  POKE_LOUNGE_E2E_RESET_DB: "1",
  PORT: apiPort,
};
const webEnvironment = {
  ...nonDatabaseEnvironment,
  NEXT_PUBLIC_API_URL: apiUrl,
  NODE_ENV: "test",
  PLAYWRIGHT_PORT: webPort,
  POKE_LOUNGE_E2E_ENV_ISOLATED: "1",
  PORT: webPort,
};
const playwrightEnvironment = {
  ...nonDatabaseEnvironment,
  NEXT_PUBLIC_API_URL: apiUrl,
  NODE_ENV: "test",
  PLAYWRIGHT_BASE_URL: webUrl,
  PLAYWRIGHT_ENABLE_CROSS_BROWSER: "1",
  PLAYWRIGHT_OUTPUT_DIR: resolve(runRoot, "playwright"),
  PLAYWRIGHT_PORT: webPort,
  PLAYWRIGHT_RETRIES: "0",
  PLAYWRIGHT_WORKERS: "1",
  POKE_LOUNGE_E2E: "1",
  POKE_LOUNGE_E2E_ENV_ISOLATED: "1",
  POKE_LOUNGE_E2E_RUN_ID: runId,
  POKE_LOUNGE_E2E_RUN_ROOT: runRoot,
};

assertClientEnvironment("Web", webEnvironment, testDatabaseUrl, databasePassword, databaseUsername);
assertClientEnvironment(
  "Playwright",
  playwrightEnvironment,
  testDatabaseUrl,
  databasePassword,
  databaseUsername,
);

const apiLog = createWriteStream(resolve(runRoot, "api.log"), { flags: "a" });
const runnerLog = createWriteStream(resolve(runRoot, "runner.log"), { flags: "a" });
let apiProcess;
let webProcess;

try {
  await runCommand(
    pnpmCommand,
    ["--filter", "@vscoke/api", "migration:run:test"],
    migrationEnvironment,
    repositoryRoot,
    runnerLog,
  );

  apiProcess = spawn(
    pnpmCommand,
    [
      "--filter",
      "@vscoke/api",
      "exec",
      "ts-node",
      "-r",
      "tsconfig-paths/register",
      "scripts/start-poke-lounge-e2e-api.ts",
    ],
    {
      cwd: repositoryRoot,
      detached: process.platform !== "win32",
      env: apiEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  pipeToConsoleAndFile(apiProcess.stdout, process.stdout, apiLog);
  pipeToConsoleAndFile(apiProcess.stderr, process.stderr, apiLog);

  await waitForUrl(`${apiUrl}/health`, 120_000);

  webProcess = spawn(process.execPath, ["scripts/playwright-web-server.mjs"], {
    cwd: webRoot,
    detached: process.platform !== "win32",
    env: webEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  pipeToConsoleAndFile(webProcess.stdout, process.stdout, runnerLog);
  pipeToConsoleAndFile(webProcess.stderr, process.stderr, runnerLog);

  await waitForUrl(`${webUrl}/ko-KR`, 120_000);

  const playwrightArgs = requestedArgs.length
    ? requestedArgs
    : ["tests/e2e/poke-lounge-five-player-tournament.spec.ts"];
  if (!playwrightArgs.some(argument => argument.startsWith("--project"))) {
    playwrightArgs.push("--project=poke-lounge-five-browser-integration");
  }

  await runCommand(
    process.execPath,
    ["scripts/playwright-runner.mjs", "test", ...playwrightArgs],
    playwrightEnvironment,
    webRoot,
    runnerLog,
  );
} finally {
  stopProcessGroup(webProcess);
  stopProcessGroup(apiProcess);
  apiLog.end();
  runnerLog.end();
}

function parseTestDatabaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("TEST_DATABASE_URL must use PostgreSQL");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("TEST_DATABASE_URL must not include query parameters or a hash");
  }
  if (!parsed.hostname || !parsed.username) {
    throw new Error("TEST_DATABASE_URL must include a host and user");
  }

  const name = decodeURIComponent(parsed.pathname.slice(1));
  if (!name || name.includes("/") || !name.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL database name must end in _test");
  }
  return parsed;
}

function assertSeparatedFromRegularDatabase(testUrl, testDatabaseName) {
  if (process.env.DB_DATABASE?.trim() === testDatabaseName) {
    throw new Error("TEST_DATABASE_URL must not target DB_DATABASE");
  }

  const target = databaseTarget(testUrl);
  for (const variable of ["DATABASE_URL", "DB_URL"]) {
    const regularValue = process.env[variable]?.trim();
    if (!regularValue) continue;

    let regular;
    try {
      regular = new URL(regularValue);
    } catch {
      continue;
    }
    if (databaseTarget(regular) === target) {
      throw new Error(`TEST_DATABASE_URL must not target ${variable}`);
    }
  }
}

function databaseTarget(url) {
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
}

function runCommand(command, args, env, cwd, log) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    pipeToConsoleAndFile(child.stdout, process.stdout, log);
    pipeToConsoleAndFile(child.stderr, process.stderr, log);
    child.once("error", reject);
    child.once("exit", code => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });
}

function pipeToConsoleAndFile(source, consoleTarget, fileTarget) {
  source?.on("data", chunk => {
    const redacted = redactIntegrationLog(
      String(chunk),
      testDatabaseUrl,
      databasePassword,
      databaseUsername,
    );
    consoleTarget.write(redacted);
    fileTarget.write(redacted);
  });
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolvePromise => setTimeout(resolvePromise, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stopProcessGroup(child) {
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
}
