export const DEFAULT_REQUIRED_PATHS = ["/espresso-history/beans", "/recipes"];

export const parseCsvList = (value, fallback = []) => {
  if (value === undefined) {
    return fallback;
  }

  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
};

export const validateOpenApiPaths = (document, requiredPaths) => {
  const paths = document?.paths ?? {};

  return requiredPaths.filter(path => !Object.hasOwn(paths, path));
};

export const validateHealthResponse = payload => {
  const isValid =
    payload?.status === "ok" &&
    typeof payload.uptime === "number" &&
    Number.isFinite(payload.uptime) &&
    typeof payload.timestamp === "string" &&
    !Number.isNaN(Date.parse(payload.timestamp));

  if (!isValid) {
    throw new Error("Invalid API health response");
  }
};

const isOpenApiDocument = payload => payload?.paths && typeof payload.paths === "object";

const fetchJson = async (url, { fetcher, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const checkEndpoint = async (url, { fetcher, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Endpoint check failed (${response.status}): ${url}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

export const checkApiHealth = async ({
  healthUrl,
  requiredPaths = [],
  endpointChecks = [],
  timeoutMs = 10_000,
  fetcher = fetch,
}) => {
  const payload = await fetchJson(healthUrl, { fetcher, timeoutMs });

  if (isOpenApiDocument(payload)) {
    const missingPaths = validateOpenApiPaths(payload, requiredPaths);

    if (missingPaths.length > 0) {
      throw new Error(`Missing required API paths: ${missingPaths.join(", ")}`);
    }
  } else {
    validateHealthResponse(payload);
  }

  for (const endpoint of endpointChecks) {
    const endpointUrl = new URL(endpoint, healthUrl).toString();
    await checkEndpoint(endpointUrl, { fetcher, timeoutMs });
  }

  return {
    endpointChecks,
    healthUrl,
    requiredPaths,
  };
};
