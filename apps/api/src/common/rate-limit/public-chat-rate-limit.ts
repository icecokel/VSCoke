import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

export const PUBLIC_CHAT_REQUEST_LIMIT = 20;
export const PUBLIC_CHAT_REQUEST_WINDOW_MS = 60 * 60 * 1000;

const CLEANUP_INTERVAL_MS = 60 * 1000;
const RATE_LIMIT_HEADER_LIMIT = 'X-RateLimit-Limit';
const RATE_LIMIT_HEADER_REMAINING = 'X-RateLimit-Remaining';
const RATE_LIMIT_HEADER_RESET = 'X-RateLimit-Reset';

type RateLimitResult = {
  isAllowed: boolean;
  limit: number;
  remaining: number;
  nextRequestAvailableAt: number;
};

const getClientIp = (request: Request): string =>
  request.ip || request.socket.remoteAddress || 'unknown';

const setRateLimitHeaders = (
  response: Response,
  result: RateLimitResult,
): void => {
  response.setHeader(RATE_LIMIT_HEADER_LIMIT, result.limit);
  response.setHeader(RATE_LIMIT_HEADER_REMAINING, result.remaining);
  response.setHeader(
    RATE_LIMIT_HEADER_RESET,
    Math.floor(result.nextRequestAvailableAt / 1000),
  );
};

export class PublicChatRateLimitStore {
  private readonly requestTimesByIp = new Map<string, number[]>();
  private lastCleanupAt = 0;

  constructor(
    private readonly requestLimit: number = PUBLIC_CHAT_REQUEST_LIMIT,
  ) {}

  consume(clientIp: string, now = Date.now()): RateLimitResult {
    this.cleanupExpiredRequests(now);

    const earliestAllowedRequestTime = now - PUBLIC_CHAT_REQUEST_WINDOW_MS;
    const requestTimes = (this.requestTimesByIp.get(clientIp) ?? []).filter(
      (requestTime) => requestTime > earliestAllowedRequestTime,
    );

    if (requestTimes.length >= this.requestLimit) {
      return {
        isAllowed: false,
        limit: this.requestLimit,
        remaining: 0,
        nextRequestAvailableAt: requestTimes[0] + PUBLIC_CHAT_REQUEST_WINDOW_MS,
      };
    }

    requestTimes.push(now);
    this.requestTimesByIp.set(clientIp, requestTimes);

    return {
      isAllowed: true,
      limit: this.requestLimit,
      remaining: this.requestLimit - requestTimes.length,
      nextRequestAvailableAt: requestTimes[0] + PUBLIC_CHAT_REQUEST_WINDOW_MS,
    };
  }

  private cleanupExpiredRequests(now: number): void {
    if (now - this.lastCleanupAt < CLEANUP_INTERVAL_MS) return;

    const earliestAllowedRequestTime = now - PUBLIC_CHAT_REQUEST_WINDOW_MS;
    for (const [clientIp, requestTimes] of this.requestTimesByIp) {
      const activeRequestTimes = requestTimes.filter(
        (requestTime) => requestTime > earliestAllowedRequestTime,
      );

      if (activeRequestTimes.length === 0) {
        this.requestTimesByIp.delete(clientIp);
      } else {
        this.requestTimesByIp.set(clientIp, activeRequestTimes);
      }
    }

    this.lastCleanupAt = now;
  }
}

export const enforcePublicChatRateLimit = (
  context: ExecutionContext,
  store: PublicChatRateLimitStore,
  errorMessage: string,
): boolean => {
  const request = context.switchToHttp().getRequest<Request>();
  const response = context.switchToHttp().getResponse<Response>();
  const result = store.consume(getClientIp(request));

  setRateLimitHeaders(response, result);

  if (!result.isAllowed) {
    throw new HttpException(errorMessage, HttpStatus.TOO_MANY_REQUESTS);
  }

  return true;
};
