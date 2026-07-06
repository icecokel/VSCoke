import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { ResumeRagController } from './resume-rag.controller';

describe('ResumeRagController', () => {
  it('채팅 endpoint는 로그인 가드 대신 공개 origin 가드로 보호한다', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ResumeRagController.prototype,
      'chat',
    );
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      descriptor?.value as object,
    ) as Array<{ name?: string }> | undefined;

    expect(guards?.map((guard) => guard.name)).toEqual([
      'ResumeRagOriginGuard',
    ]);
    expect(guards).not.toContain(GoogleAuthGuard);
  });
});
