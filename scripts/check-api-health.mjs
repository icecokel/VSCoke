const healthUrl = process.env.API_HEALTH_URL ?? "https://api.icecoke.kr/api-json";
const timeoutMs = Number(process.env.API_HEALTH_TIMEOUT_MS ?? 10_000);
const retries = Number(process.env.API_HEALTH_RETRIES ?? 3);
const retryDelayMs = Number(process.env.API_HEALTH_RETRY_DELAY_MS ?? 2_000);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const check = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

let lastError;

for (let attempt = 1; attempt <= retries; attempt += 1) {
  try {
    await check();
    console.log(`API health check passed: ${healthUrl}`);
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
