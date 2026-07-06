import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import {
  ResumeRagOriginGuard,
  resolveResumeRagPublicChatOrigins,
} from './resume-rag-origin.guard';

const createContext = (headers: Record<string, string | undefined>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('ResumeRagOriginGuard', () => {
  it('운영 웹 origin의 채팅 요청을 허용한다', () => {
    const guard = new ResumeRagOriginGuard();

    expect(
      guard.canActivate(createContext({ origin: 'https://vscoke.vercel.app' })),
    ).toBe(true);
  });

  it('허용되지 않은 origin과 origin 없는 요청을 차단한다', () => {
    const guard = new ResumeRagOriginGuard();

    expect(() =>
      guard.canActivate(createContext({ origin: 'https://example.com' })),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(createContext({}))).toThrow(
      ForbiddenException,
    );
  });

  it('production 기본값은 운영 웹 origin만 허용한다', () => {
    expect(resolveResumeRagPublicChatOrigins(undefined, 'production')).toEqual([
      'https://vscoke.vercel.app',
    ]);
  });

  it('명시된 public chat origin은 origin 형태만 허용한다', () => {
    expect(
      resolveResumeRagPublicChatOrigins(
        [
          'https://vscoke.vercel.app/',
          'https://preview.example.com',
          'https://preview.example.com/path',
          'https://*.example.com',
        ].join(','),
        'production',
      ),
    ).toEqual(['https://vscoke.vercel.app', 'https://preview.example.com']);
  });
});
