import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  PublicChatRateLimitStore,
  enforcePublicChatRateLimit,
} from '../common/rate-limit/public-chat-rate-limit';

@Injectable()
export class BeatJevRateLimitGuard implements CanActivate {
  private readonly store = new PublicChatRateLimitStore(240);

  canActivate(context: ExecutionContext): boolean {
    return enforcePublicChatRateLimit(
      context,
      this.store,
      'JEV 게임 요청은 IP당 1시간에 240회까지 사용할 수 있습니다.',
    );
  }
}
