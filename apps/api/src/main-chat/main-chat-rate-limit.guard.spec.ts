import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ResumeRagRateLimitGuard } from '../resume-rag/resume-rag-rate-limit.guard';
import { MainChatRateLimitGuard } from './main-chat-rate-limit.guard';

const createContext = (ip: string) => {
  const responseHeaders = new Map<string, string | number>();

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => ({ ip }),
        getResponse: () => ({
          setHeader: (name: string, value: string | number) => {
            responseHeaders.set(name, value);
          },
        }),
      }),
    } as unknown as ExecutionContext,
    responseHeaders,
  };
};

describe('MainChatRateLimitGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('같은 IP의 31번째 메인 채팅 요청을 429로 차단한다', () => {
    const guard = new MainChatRateLimitGuard();
    const { context } = createContext('198.51.100.20');

    Array.from({ length: 30 }).forEach(() => {
      expect(guard.canActivate(context)).toBe(true);
    });

    let error: unknown;
    try {
      guard.canActivate(context);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('성공 응답에 남은 횟수와 다음 복구 시각을 설정한다', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const guard = new MainChatRateLimitGuard();
    const { context, responseHeaders } = createContext('198.51.100.20');

    expect(guard.canActivate(context)).toBe(true);
    expect(responseHeaders).toEqual(
      new Map([
        ['X-RateLimit-Limit', 30],
        ['X-RateLimit-Remaining', 29],
        ['X-RateLimit-Reset', Math.floor((now + 60 * 60 * 1000) / 1000)],
      ]),
    );
  });

  it('서로 다른 IP는 요청 횟수를 공유하지 않는다', () => {
    const guard = new MainChatRateLimitGuard();
    const firstIpContext = createContext('198.51.100.22').context;

    Array.from({ length: 30 }).forEach(() => {
      guard.canActivate(firstIpContext);
    });

    const { context, responseHeaders } = createContext('198.51.100.23');
    expect(guard.canActivate(context)).toBe(true);
    expect(responseHeaders.get('X-RateLimit-Remaining')).toBe(29);
  });

  it('정확히 1시간이 지난 요청은 다시 허용한다', () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const guard = new MainChatRateLimitGuard();
    const context = createContext('198.51.100.24').context;

    Array.from({ length: 30 }).forEach(() => {
      guard.canActivate(context);
    });
    now = 60 * 60 * 1000;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('차단된 요청에도 한도와 복구 시각 헤더를 설정한다', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const guard = new MainChatRateLimitGuard();
    const ip = '198.51.100.25';

    Array.from({ length: 30 }).forEach(() => {
      guard.canActivate(createContext(ip).context);
    });

    const { context, responseHeaders } = createContext(ip);
    expect(() => guard.canActivate(context)).toThrow(
      '메인 채팅은 IP당 1시간에 30회까지 사용할 수 있습니다.',
    );
    expect(responseHeaders).toEqual(
      new Map([
        ['X-RateLimit-Limit', 30],
        ['X-RateLimit-Remaining', 0],
        ['X-RateLimit-Reset', Math.floor((now + 60 * 60 * 1000) / 1000)],
      ]),
    );
  });

  it('메인 채팅 사용 횟수는 기존 이력서 채팅 횟수를 차감하지 않는다', () => {
    const mainChatGuard = new MainChatRateLimitGuard();
    const resumeRagGuard = new ResumeRagRateLimitGuard();
    const ip = '198.51.100.20';

    Array.from({ length: 30 }).forEach(() => {
      mainChatGuard.canActivate(createContext(ip).context);
    });

    const { context, responseHeaders } = createContext(ip);
    expect(resumeRagGuard.canActivate(context)).toBe(true);
    expect(responseHeaders.get('X-RateLimit-Remaining')).toBe(19);
  });

  it('기존 이력서 채팅 사용 횟수는 메인 채팅 횟수를 차감하지 않는다', () => {
    const mainChatGuard = new MainChatRateLimitGuard();
    const resumeRagGuard = new ResumeRagRateLimitGuard();
    const ip = '198.51.100.21';

    Array.from({ length: 20 }).forEach(() => {
      resumeRagGuard.canActivate(createContext(ip).context);
    });

    const { context, responseHeaders } = createContext(ip);
    expect(mainChatGuard.canActivate(context)).toBe(true);
    expect(responseHeaders.get('X-RateLimit-Remaining')).toBe(29);
  });
});
