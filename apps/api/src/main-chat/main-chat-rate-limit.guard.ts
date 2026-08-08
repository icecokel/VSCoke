import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  PublicChatRateLimitStore,
  enforcePublicChatRateLimit,
} from '../common/rate-limit/public-chat-rate-limit';

export const MAIN_CHAT_REQUEST_LIMIT = 30;

@Injectable()
export class MainChatRateLimitGuard implements CanActivate {
  private readonly store = new PublicChatRateLimitStore(
    MAIN_CHAT_REQUEST_LIMIT,
  );

  canActivate(context: ExecutionContext): boolean {
    return enforcePublicChatRateLimit(
      context,
      this.store,
      '메인 채팅은 IP당 1시간에 30회까지 사용할 수 있습니다.',
    );
  }
}
