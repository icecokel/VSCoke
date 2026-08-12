import { ApiError, apiClient } from "@/lib/api-client";
import type { ResumeRagChatRequest, ResumeRagChatResponse, ResumeRagSource } from "../types";

export type ResumeRagRateLimit = {
  limit: number;
  remaining: number;
  resetAt: Date;
};

export type ResumeRagChatResult = ResumeRagChatResponse & {
  rateLimit?: ResumeRagRateLimit;
};

export class ResumeRagContractError extends Error {
  constructor(message = "Resume RAG API returned an invalid response.") {
    super(message);
    this.name = "ResumeRagContractError";
  }
}

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

const isResumeRagSource = (value: unknown): value is ResumeRagSource => {
  if (!value || typeof value !== "object") return false;

  const source = value as Partial<ResumeRagSource>;

  return (
    typeof source.title === "string" &&
    typeof source.sourcePath === "string" &&
    typeof source.sourceKey === "string" &&
    typeof source.excerpt === "string" &&
    typeof source.similarity === "number" &&
    Number.isFinite(source.similarity) &&
    isOptionalString(source.sectionPath) &&
    isOptionalString(source.version) &&
    isOptionalString(source.publicUrl) &&
    (source.caveats === undefined ||
      (Array.isArray(source.caveats) && source.caveats.every(caveat => typeof caveat === "string")))
  );
};

const isResumeRagChatResponse = (value: unknown): value is ResumeRagChatResponse => {
  if (!value || typeof value !== "object") return false;

  const response = value as Partial<ResumeRagChatResponse>;

  return (
    typeof response.answer === "string" &&
    typeof response.grounded === "boolean" &&
    Array.isArray(response.sources) &&
    response.sources.every(isResumeRagSource)
  );
};

const parseRateLimitInteger = (headers: Headers, name: string): number | undefined => {
  const value = headers.get(name);

  if (!value || !/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

export const readResumeRagRateLimit = (headers: Headers): ResumeRagRateLimit | undefined => {
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

export const readResumeRagRateLimitFromError = (error: unknown): ResumeRagRateLimit | undefined => {
  if (!(error instanceof ApiError) || !error.headers) return undefined;

  return readResumeRagRateLimit(error.headers);
};

export const askResumeRag = async (request: ResumeRagChatRequest): Promise<ResumeRagChatResult> => {
  const { data: response, headers } = await apiClient.postWithResponse<ResumeRagChatResponse>(
    "/resume-rag/chat",
    request,
  );

  if (!isResumeRagChatResponse(response)) {
    throw new ResumeRagContractError();
  }

  return {
    ...response,
    rateLimit: readResumeRagRateLimit(headers),
  };
};
