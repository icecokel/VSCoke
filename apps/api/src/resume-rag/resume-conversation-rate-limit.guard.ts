import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import {
  enforcePublicChatRateLimit,
  PublicChatRateLimitStore,
} from '../common/rate-limit/public-chat-rate-limit';

@Injectable()
export class ResumeConversationRateLimitGuard implements CanActivate {
  private readonly store = new PublicChatRateLimitStore(120);
  canActivate(context: ExecutionContext): boolean {
    return enforcePublicChatRateLimit(
      context,
      this.store,
      'Too many conversation management requests',
    );
  }
}
