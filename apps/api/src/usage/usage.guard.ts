import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import {
  enforcePublicChatRateLimit,
  PublicChatRateLimitStore,
} from '../common/rate-limit/public-chat-rate-limit';
import { resolveCorsOrigins } from '../common/utils/cors.util';

@Injectable()
export class UsageIngestGuard implements CanActivate {
  private readonly store = new PublicChatRateLimitStore(600);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (
      origin &&
      !resolveCorsOrigins(process.env.CORS_ORIGINS).includes(origin)
    ) {
      throw new ForbiddenException('허용되지 않은 사용 집계 origin입니다.');
    }
    return enforcePublicChatRateLimit(
      context,
      this.store,
      '사용 집계 요청이 너무 많습니다.',
    );
  }
}

@Injectable()
export class UsageReadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const key = process.env.USAGE_ANALYTICS_READ_KEY;
    if (!key || key.length < 32) {
      throw new ServiceUnavailableException(
        '사용 집계 조회 키가 설정되지 않았습니다.',
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    const providedKey = Buffer.from(token);
    const expectedKey = Buffer.from(key);
    if (
      providedKey.length !== expectedKey.length ||
      !timingSafeEqual(providedKey, expectedKey)
    ) {
      throw new UnauthorizedException('사용 집계 조회 인증이 필요합니다.');
    }
    return true;
  }
}
