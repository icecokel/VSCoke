import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { MainChatController } from './main-chat.controller';

describe('MainChatController', () => {
  it('메인 채팅 endpoint는 로그인 가드 없이 공개 origin과 전용 요청 제한으로 보호한다', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      MainChatController.prototype,
      'chat',
    );
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      descriptor?.value as object,
    ) as Array<{ name?: string }> | undefined;

    expect(guards?.map((guard) => guard.name)).toEqual([
      'ResumeRagOriginGuard',
      'MainChatRateLimitGuard',
    ]);
    expect(guards).not.toContain(GoogleAuthGuard);
  });
});
