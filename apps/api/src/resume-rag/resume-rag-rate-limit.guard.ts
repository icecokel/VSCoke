import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  PublicChatRateLimitStore,
  enforcePublicChatRateLimit,
} from '../common/rate-limit/public-chat-rate-limit';
import { isValidChatRequestBody } from './resume-rag-chat-request-validity';

@Injectable()
export class ResumeRagRateLimitGuard implements CanActivate {
  private readonly store = new PublicChatRateLimitStore();

  canActivate(context: ExecutionContext): boolean {
    return enforcePublicChatRateLimit(
      context,
      this.store,
      '이력 채팅은 IP당 1시간에 20회까지 사용할 수 있습니다.',
      { shouldCount: isValidChatRequestBody },
    );
  }
}
