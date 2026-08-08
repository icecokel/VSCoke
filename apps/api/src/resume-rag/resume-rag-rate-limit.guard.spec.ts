import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ResumeRagRateLimitGuard } from './resume-rag-rate-limit.guard';

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

describe('ResumeRagRateLimitGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('같은 IP의 21번째 채팅 요청을 429로 차단한다', () => {
    const guard = new ResumeRagRateLimitGuard();
    const { context } = createContext('198.51.100.10');

    Array.from({ length: 20 }).forEach(() => {
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

  it('서로 다른 IP는 요청 횟수를 공유하지 않는다', () => {
    const guard = new ResumeRagRateLimitGuard();
    const { context: firstIpContext } = createContext('198.51.100.10');

    Array.from({ length: 20 }).forEach(() => {
      guard.canActivate(firstIpContext);
    });

    expect(guard.canActivate(createContext('198.51.100.11').context)).toBe(
      true,
    );
  });

  it('1시간이 지난 요청은 다시 허용한다', () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const guard = new ResumeRagRateLimitGuard();
    const { context } = createContext('198.51.100.10');

    Array.from({ length: 20 }).forEach(() => {
      guard.canActivate(context);
    });
    now += 60 * 60 * 1000;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('허용된 요청에 남은 횟수와 다음 1회 복구 시각 헤더를 설정한다', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const guard = new ResumeRagRateLimitGuard();
    const { context, responseHeaders } = createContext('198.51.100.10');

    expect(guard.canActivate(context)).toBe(true);
    expect(responseHeaders).toEqual(
      new Map([
        ['X-RateLimit-Limit', 20],
        ['X-RateLimit-Remaining', 19],
        ['X-RateLimit-Reset', Math.floor((now + 60 * 60 * 1000) / 1000)],
      ]),
    );
  });

  it('차단된 요청에도 남은 횟수와 다음 1회 복구 시각 헤더를 설정한다', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const guard = new ResumeRagRateLimitGuard();
    const allowedContext = createContext('198.51.100.10').context;

    Array.from({ length: 20 }).forEach(() => {
      guard.canActivate(allowedContext);
    });

    const { context, responseHeaders } = createContext('198.51.100.10');

    expect(() => guard.canActivate(context)).toThrow(
      '이력 채팅은 IP당 1시간에 20회까지 사용할 수 있습니다.',
    );
    expect(responseHeaders).toEqual(
      new Map([
        ['X-RateLimit-Limit', 20],
        ['X-RateLimit-Remaining', 0],
        ['X-RateLimit-Reset', Math.floor((now + 60 * 60 * 1000) / 1000)],
      ]),
    );
  });
});
