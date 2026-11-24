import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ResumeRagRateLimitGuard } from './resume-rag-rate-limit.guard';

const VALID_CHAT_BODY = {
  question: '오프리메드 경험을 알려줘',
  locale: 'ko-KR',
};

const createContext = (ip: string, body: unknown = VALID_CHAT_BODY) => {
  const responseHeaders = new Map<string, string | number>();

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => ({ ip, body }),
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

  it.each([
    [
      '198.51.100.31',
      '1,001자 질문',
      { question: '가'.repeat(1001), locale: 'ko-KR' },
    ],
    [
      '198.51.100.32',
      '지원하지 않는 언어',
      { question: '오프리메드 경험', locale: 'fr-FR' },
    ],
    [
      '198.51.100.33',
      '허용하지 않는 필드',
      { question: '오프리메드 경험', locale: 'ko-KR', extra: 1 },
    ],
    ['198.51.100.34', '본문 없음', null],
  ])(
    '%s %s처럼 검증에서 거절될 요청은 횟수를 차감하지 않는다',
    (ip, _, body) => {
      const guard = new ResumeRagRateLimitGuard();

      expect(guard.canActivate(createContext(ip, body).context)).toBe(true);

      const { context, responseHeaders } = createContext(ip);
      expect(guard.canActivate(context)).toBe(true);
      expect(responseHeaders.get('X-RateLimit-Remaining')).toBe(19);
    },
  );

  it('1,000자 질문은 정상 요청으로 횟수를 차감한다', () => {
    const guard = new ResumeRagRateLimitGuard();
    const { context, responseHeaders } = createContext('198.51.100.35', {
      question: '가'.repeat(1000),
      locale: 'ko-KR',
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(responseHeaders.get('X-RateLimit-Remaining')).toBe(19);
  });
});
