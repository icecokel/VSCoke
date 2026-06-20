import { createWinstonConfig } from './winston.config';

type WinstonTransport = {
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
});
