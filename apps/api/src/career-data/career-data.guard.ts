import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class CareerDataGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const key = process.env.CAREER_DATA_WRITE_KEY;
    if (!key || key.length < 32)
      throw new ServiceUnavailableException(
        '공통 경력 관리 키가 설정되지 않았습니다.',
      );
    const authorization = context.switchToHttp().getRequest<Request>()
      .headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    const provided = Buffer.from(token);
    const expected = Buffer.from(key);
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    )
      throw new UnauthorizedException('공통 경력 관리 인증이 필요합니다.');
    return true;
  }
}
