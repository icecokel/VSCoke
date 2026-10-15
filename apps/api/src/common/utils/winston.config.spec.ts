import { createWinstonConfig, resolveLogLevel } from './winston.config';
import { requestLogContext } from '../logging/request-log-context';

type WinstonTransport = {
  level?: string;
  options?: {
    filename?: string;
    maxFiles?: string;
  };
  constructor: {
    name: string;
  };
};

const ORIGINAL_ENV = process.env;

describe('winstonConfig', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NOTIFY_SERVICE_URL;
    delete process.env.NOTIFY_SERVICE_USER;
    delete process.env.NOTIFY_SERVICE_PASSWORD;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('운영 환경에서도 알림 env가 없으면 NotifyTransport를 등록하지 않아야 함', () => {
    process.env.NODE_ENV = 'production';

    const winstonConfig = createWinstonConfig() as {
      level: string;
      transports: WinstonTransport[];
    };

    expect(
      winstonConfig.transports.some(
        (transport) => transport.constructor.name === 'NotifyTransport',
      ),
    ).toBe(false);
  });

  it('운영 알림 env가 있어도 Winston transport에서 중복 알림을 보내지 않아야 함', () => {
    process.env.NODE_ENV = 'production';
    process.env.NOTIFY_SERVICE_URL = 'https://notify.example.test/send';
    process.env.NOTIFY_SERVICE_USER = 'notify-user';
    process.env.NOTIFY_SERVICE_PASSWORD = 'notify-password';

    const winstonConfig = createWinstonConfig() as {
      transports: WinstonTransport[];
    };

    expect(
      winstonConfig.transports.some(
        (transport) => transport.constructor.name === 'NotifyTransport',
      ),
    ).toBe(false);
  });

  it('LOG_LEVEL이 있으면 콘솔 로그 최소 레벨로 사용해야 한다', () => {
    process.env.LOG_LEVEL = 'warn';

    const winstonConfig = createWinstonConfig() as {
      level: string;
      transports: WinstonTransport[];
    };
    const consoleTransport = winstonConfig.transports.find(
      (transport) => transport.constructor.name === 'Console',
    );

    expect(consoleTransport?.level).toBe('warn');
    expect(winstonConfig.level).toBe('warn');
  });

  it('일별 파일 로그는 180일 동안 보관해야 한다', () => {
    const winstonConfig = createWinstonConfig() as {
      transports: WinstonTransport[];
    };
    const fileTransports = winstonConfig.transports.filter(
      (transport) => transport.constructor.name === 'DailyRotateFile',
    );

    expect(fileTransports).toHaveLength(2);
    expect(
      fileTransports.map((transport) => transport.options?.maxFiles),
    ).toEqual(['180d', '180d']);
  });

  it('구조화 이벤트를 정규화하고 요청 ID와 마스킹을 모든 출력에 적용한다', () => {
    const config = createWinstonConfig();
    const requestId = 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594';
    const info = {
      level: 'info',
      message: JSON.stringify({
        event: 'auth.login',
        password: 'private-password',
        question: 'private-question',
        count: 3,
      }),
    };

    const result = requestLogContext.run({ requestId }, () =>
      config.format.transform(info, {}),
    );

    expect(result).toMatchObject({
      event: 'auth.login',
      message: 'auth.login',
      level: 'info',
      requestId,
      password: '[REDACTED]',
      question: '[REDACTED]',
      count: 3,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private-password|private-question/,
    );
    config.transports.forEach((transport) => transport.close?.());
  });
});

describe('resolveLogLevel', () => {
  it.each([undefined, '', '   '])(
    '운영 미설정·빈값 %p은 info를 사용한다',
    (level) => {
      expect(
        resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: level }),
      ).toBe('info');
    },
  );
  it.each([undefined, '', '   '])(
    '개발 미설정·빈값 %p은 debug를 사용한다',
    (level) => {
      expect(
        resolveLogLevel({ NODE_ENV: 'development', LOG_LEVEL: level }),
      ).toBe('debug');
    },
  );
  it.each(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])(
    '허용 레벨 %s을 사용한다',
    (level) => {
      expect(resolveLogLevel({ LOG_LEVEL: level })).toBe(level);
    },
  );
  it('공백과 대문자를 정규화한다', () => {
    expect(resolveLogLevel({ LOG_LEVEL: ' WARN ' })).toBe('warn');
  });
  it('잘못된 레벨은 값을 노출하지 않고 실패한다', () => {
    expect(() =>
      resolveLogLevel({ LOG_LEVEL: 'invalid-private-value' }),
    ).toThrow('Invalid LOG_LEVEL');
    expect(() =>
      resolveLogLevel({ LOG_LEVEL: 'invalid-private-value' }),
    ).not.toThrow('invalid-private-value');
  });
});
