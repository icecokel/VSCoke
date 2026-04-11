import { spawn } from "node:child_process";

const nodeCommand = process.execPath;
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const host = process.env.HOSTNAME ?? "127.0.0.1";
const defaultPort = String(39000 + (process.pid % 10000));
const defaultNextDistDir = `.next-e2e-${process.pid}`;
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const port = process.env.PLAYWRIGHT_PORT ?? defaultPort;
const nextDistDir = process.env.NEXT_DIST_DIR ?? defaultNextDistDir;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;
const readyUrl = `${baseURL}/ko-KR`;
const reuseExistingServer =
  process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";

const serverEnv = {
  ...process.env,
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
  AUTH_URL: process.env.AUTH_URL ?? baseURL,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-auth-secret",
  HOSTNAME: host,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-auth-secret",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseURL,
  NEXT_DIST_DIR: nextDistDir,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:65535",
  PLAYWRIGHT_BASE_URL: baseURL,
  PLAYWRIGHT_PORT: port,
  PORT: port,
};

const playwrightArgs = process.argv.slice(2);
if (playwrightArgs.length === 0) {
  playwrightArgs.push("test");
}
if (playwrightArgs[0] === "codegen" && playwrightArgs.length === 1) {
  playwrightArgs.push(baseURL);
}

let shuttingDown = false;
let server;

const shutdownServer = () => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (server && !server.killed) {
    server.kill("SIGTERM");
  }
};

const isServerReady = async () => {
  try {
    const response = await fetch(readyUrl, { redirect: "manual" });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
};

const waitForServer = async timeoutMs => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Playwright server at ${readyUrl}`);
};

const run = async () => {
  process.on("SIGINT", shutdownServer);
  process.on("SIGTERM", shutdownServer);

  if (useExternalServer) {
    await waitForServer(120_000);
  } else if (!(reuseExistingServer && (await isServerReady()))) {
    server = spawn(nodeCommand, ["scripts/playwright-web-server.mjs"], {
      env: serverEnv,
      stdio: ["ignore", "inherit", "inherit"],
    });

    server.on("exit", code => {
      if (!shuttingDown && code !== 0) {
        process.exit(code ?? 1);
      }
    });

    await waitForServer(120_000);
  }

  const playwright = spawn(pnpmCommand, ["exec", "playwright", ...playwrightArgs], {
    env: serverEnv,
    stdio: "inherit",
  });

  playwright.on("exit", code => {
    shutdownServer();
    process.exit(code ?? 1);
  });
};

run().catch(error => {
  shutdownServer();
  console.error(error);
  process.exit(1);
});
