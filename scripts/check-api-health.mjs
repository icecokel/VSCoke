import { DEFAULT_REQUIRED_PATHS, checkApiHealth, parseCsvList } from "./api-health-checker.mjs";

const healthUrl = process.env.API_HEALTH_URL ?? "https://api.icecoke.kr/api-json";
const requiredPaths = parseCsvList(process.env.API_REQUIRED_PATHS, DEFAULT_REQUIRED_PATHS);
const endpointChecks = parseCsvList(process.env.API_ENDPOINT_CHECKS, requiredPaths);
const timeoutMs = Number(process.env.API_HEALTH_TIMEOUT_MS ?? 10_000);
const retries = Number(process.env.API_HEALTH_RETRIES ?? 3);
const retryDelayMs = Number(process.env.API_HEALTH_RETRY_DELAY_MS ?? 2_000);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let lastError;

for (let attempt = 1; attempt <= retries; attempt += 1) {
  try {
    await checkApiHealth({
      endpointChecks,
      healthUrl,
      requiredPaths,
      timeoutMs,
    });
    console.log(
      `API health check passed: ${healthUrl} ` +
        `(paths: ${requiredPaths.join(", ") || "none"}, endpoints: ${
          endpointChecks.join(", ") || "none"
        })`,
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`API health check failed (${attempt}/${retries}): ${error}`);

    if (attempt < retries) {
      await wait(retryDelayMs);
    }
  }
}

console.error(`API health check failed: ${healthUrl}`);
if (lastError) {
  console.error(lastError);
}
process.exit(1);
