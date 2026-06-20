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
  const document = await fetchJson(healthUrl, { fetcher, timeoutMs });
  const missingPaths = validateOpenApiPaths(document, requiredPaths);

  if (missingPaths.length > 0) {
    throw new Error(`Missing required API paths: ${missingPaths.join(", ")}`);
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
