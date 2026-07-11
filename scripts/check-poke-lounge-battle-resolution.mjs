import { createRequire } from "node:module";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(repoRoot, "apps/api");
const packageRoot = path.join(repoRoot, "packages/poke-lounge-battle");
const packageName = "@vscoke/poke-lounge-battle";
const mode = process.argv[2];
const apiRequire = createRequire(path.join(apiRoot, "package.json"));

if (mode === "types") {
  rmSync(path.join(packageRoot, "dist"), { recursive: true, force: true });

  const ts = apiRequire("typescript");
  const configPath = path.join(apiRoot, "tsconfig.json");
  const config = ts.parseJsonConfigFileContent(
    ts.parseConfigFileTextToJson(configPath, readFileSync(configPath, "utf8")).config,
    ts.sys,
    apiRoot,
  );
  const resolution = ts.resolveModuleName(
    packageName,
    path.join(apiRoot, "src/main.ts"),
    config.options,
    ts.sys,
  ).resolvedModule;
  const expected = path.join(packageRoot, "src/index.ts");

  if (!resolution || path.resolve(resolution.resolvedFileName) !== expected) {
    throw new Error(
      `Expected TypeScript to resolve ${packageName} to ${expected}, received ${resolution?.resolvedFileName ?? "unresolved"}`,
    );
  }
} else if (mode === "runtime") {
  const expected = path.join(packageRoot, "dist/index.js");
  const resolved = apiRequire.resolve(packageName);

  if (path.resolve(resolved) !== expected) {
    throw new Error(
      `Expected Node.js to resolve ${packageName} to ${expected}, received ${resolved}`,
    );
  }

  apiRequire(packageName);
} else {
  throw new Error('Expected mode to be either "types" or "runtime"');
}
