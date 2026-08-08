import { ApiError, apiClient } from "@/lib/api-client";
import type {
  MainChatRateLimit,
  MainChatRequest,
  MainChatResponse,
  MainChatResult,
  MainChatSource,
} from "../types";

export class MainChatContractError extends Error {
  constructor(message = "Main chat API returned an invalid response.") {
    super(message);
    this.name = "MainChatContractError";
  }
}

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

const isMainChatSource = (value: unknown): value is MainChatSource => {
  if (!value || typeof value !== "object") return false;

  const source = value as Partial<MainChatSource>;

  return (
    typeof source.title === "string" &&
    typeof source.sourcePath === "string" &&
    typeof source.sourceKey === "string" &&
    typeof source.excerpt === "string" &&
    typeof source.similarity === "number" &&
    Number.isFinite(source.similarity) &&
    isOptionalString(source.sectionPath) &&
    isOptionalString(source.version) &&
    (source.caveats === undefined ||
      (Array.isArray(source.caveats) && source.caveats.every(caveat => typeof caveat === "string")))
  );
};

const isMainChatResponse = (value: unknown): value is MainChatResponse => {
  if (!value || typeof value !== "object") return false;

  const response = value as Partial<MainChatResponse>;

  return (
    typeof response.answer === "string" &&
    typeof response.grounded === "boolean" &&
    Array.isArray(response.sources) &&
    response.sources.every(isMainChatSource)
  );
};

const parseRateLimitInteger = (headers: Headers, name: string): number | undefined => {
  const value = headers.get(name);

  if (!value || !/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

export const readMainChatRateLimit = (headers: Headers): MainChatRateLimit | undefined => {
  const limit = parseRateLimitInteger(headers, "X-RateLimit-Limit");
  const remaining = parseRateLimitInteger(headers, "X-RateLimit-Remaining");
  const resetAtSeconds = parseRateLimitInteger(headers, "X-RateLimit-Reset");

  if (
    limit === undefined ||
    remaining === undefined ||
    resetAtSeconds === undefined ||
    limit < 1 ||
    remaining > limit ||
    resetAtSeconds < 1
  ) {
    return undefined;
  }

  return {
    limit,
    remaining,
    resetAt: new Date(resetAtSeconds * 1000),
  };
};

export const readMainChatRateLimitFromError = (error: unknown): MainChatRateLimit | undefined => {
  if (!(error instanceof ApiError) || !error.headers) return undefined;

  return readMainChatRateLimit(error.headers);
};

export const askMainChat = async (request: MainChatRequest): Promise<MainChatResult> => {
  try {
    const { data: response, headers } = await apiClient.postWithResponse<MainChatResponse>(
      "/main-chat",
      request,
    );

    if (!isMainChatResponse(response)) {
      throw new MainChatContractError();
    }

    return {
      ...response,
      rateLimit: readMainChatRateLimit(headers),
    };
  } catch (error) {
    if (error instanceof SyntaxError) throw new MainChatContractError();

    throw error;
  }
};
