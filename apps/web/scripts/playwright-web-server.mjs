import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const host = process.env.HOSTNAME ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? String(39000 + (process.pid % 10000));
const nextDistDir = process.env.NEXT_DIST_DIR ?? `.next-e2e-${process.pid}`;
const nextTsconfigPath =
  process.env.NEXT_TYPESCRIPT_CONFIG_PATH ?? `.next-e2e-tsconfig-${process.pid}.json`;

const rootTsconfigPath = path.resolve("tsconfig.json");
const resolvedNextTsconfigPath = path.resolve(nextTsconfigPath);
const rawTsconfig = JSON.parse(readFileSync(rootTsconfigPath, "utf8"));
const sanitizedTsconfig = {
  ...rawTsconfig,
  include: Array.isArray(rawTsconfig.include)
    ? rawTsconfig.include.filter(
        entry => typeof entry !== "string" || !entry.startsWith(".next-e2e"),
      )
    : rawTsconfig.include,
};

mkdirSync(path.dirname(resolvedNextTsconfigPath), { recursive: true });
writeFileSync(resolvedNextTsconfigPath, `${JSON.stringify(sanitizedTsconfig, null, 2)}\n`);

const serverEnv = {
  ...process.env,
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
  AUTH_URL: process.env.AUTH_URL ?? `http://${host}:${port}`,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-auth-secret",
  HOSTNAME: host,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-auth-secret",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? `http://${host}:${port}`,
  NEXT_DIST_DIR: nextDistDir,
  NEXT_TYPESCRIPT_CONFIG_PATH: nextTsconfigPath,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:65535",
  PLAYWRIGHT_PORT: port,
  PORT: port,
};

const server = spawn(pnpmCommand, ["exec", "next", "dev", "--hostname", host, "--port", port], {
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
  env: serverEnv,
});

server.stdout.on("data", chunk => {
  process.stdout.write(chunk);
});

server.stderr.on("data", chunk => {
  process.stderr.write(chunk);
});

const shutdown = () => {
  if (server.killed) {
    return;
  }

  if (process.platform === "win32") {
    server.kill("SIGTERM");
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("exit", code => {
  process.exit(code ?? 0);
});
