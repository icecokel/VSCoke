import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const CHAT_REQUEST_LIMIT = 20;
const CHAT_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const RATE_LIMIT_HEADER_LIMIT = 'X-RateLimit-Limit';
const RATE_LIMIT_HEADER_REMAINING = 'X-RateLimit-Remaining';
const RATE_LIMIT_HEADER_RESET = 'X-RateLimit-Reset';

const getClientIp = (request: Request): string =>
  request.ip || request.socket.remoteAddress || 'unknown';

const setRateLimitHeaders = (
  response: Response,
  remaining: number,
  nextRequestAvailableAt: number,
): void => {
  response.setHeader(RATE_LIMIT_HEADER_LIMIT, CHAT_REQUEST_LIMIT);
  response.setHeader(RATE_LIMIT_HEADER_REMAINING, remaining);
  response.setHeader(
    RATE_LIMIT_HEADER_RESET,
    Math.floor(nextRequestAvailableAt / 1000),
  );
};

@Injectable()
export class ResumeRagRateLimitGuard implements CanActivate {
  private readonly requestTimesByIp = new Map<string, number[]>();
  private lastCleanupAt = 0;

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    this.cleanupExpiredRequests(now);

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const clientIp = getClientIp(request);
    const earliestAllowedRequestTime = now - CHAT_REQUEST_WINDOW_MS;
    const requestTimes = (this.requestTimesByIp.get(clientIp) ?? []).filter(
      (requestTime) => requestTime > earliestAllowedRequestTime,
    );

    if (requestTimes.length >= CHAT_REQUEST_LIMIT) {
      setRateLimitHeaders(
        response,
        0,
        requestTimes[0] + CHAT_REQUEST_WINDOW_MS,
      );
      throw new HttpException(
        '이력 채팅은 IP당 1시간에 20회까지 사용할 수 있습니다.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    requestTimes.push(now);
    this.requestTimesByIp.set(clientIp, requestTimes);
    setRateLimitHeaders(
      response,
      CHAT_REQUEST_LIMIT - requestTimes.length,
      requestTimes[0] + CHAT_REQUEST_WINDOW_MS,
    );

    return true;
  }

  private cleanupExpiredRequests(now: number): void {
    if (now - this.lastCleanupAt < CLEANUP_INTERVAL_MS) return;

    const earliestAllowedRequestTime = now - CHAT_REQUEST_WINDOW_MS;
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
