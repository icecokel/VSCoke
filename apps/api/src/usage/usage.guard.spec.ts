import {
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UsageIngestGuard, UsageReadGuard } from './usage.guard';

const contextFor = (headers: Request['headers']): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, ip: '127.0.0.1' }),
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
  }) as ExecutionContext;

describe('UsageIngestGuard', () => {
  it('allows known origins and server requests with no Origin', () => {
    const guard = new UsageIngestGuard();
    expect(
      guard.canActivate(contextFor({ origin: 'https://vscoke.icecoke.kr' })),
    ).toBe(true);
    expect(guard.canActivate(contextFor({}))).toBe(true);
  });

  it('rejects a foreign origin before consuming the rate limit', () => {
    const guard = new UsageIngestGuard();
    expect(() =>
      guard.canActivate(contextFor({ origin: 'https://evil.example.com' })),
    ).toThrow(ForbiddenException);
  });

  it('enforces 600 events per IP in an hour', () => {
    const guard = new UsageIngestGuard();
    const context = contextFor({});
    for (let index = 0; index < 600; index++) {
      expect(guard.canActivate(context)).toBe(true);
    }
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });
});

describe('UsageReadGuard', () => {
  const previousKey = process.env.USAGE_ANALYTICS_READ_KEY;
  const key = 'usage-summary-test-key-32-characters';

  afterEach(() => {
    if (previousKey === undefined) delete process.env.USAGE_ANALYTICS_READ_KEY;
    else process.env.USAGE_ANALYTICS_READ_KEY = previousKey;
  });

  it.each([undefined, '', 'short'])(
    'fails closed when configured key is invalid: %s',
    (value) => {
      if (value === undefined) delete process.env.USAGE_ANALYTICS_READ_KEY;
      else process.env.USAGE_ANALYTICS_READ_KEY = value;
      expect(() => new UsageReadGuard().canActivate(contextFor({}))).toThrow(
        ServiceUnavailableException,
      );
    },
  );

  it('requires a matching Bearer key, including equal-length wrong keys', () => {
    process.env.USAGE_ANALYTICS_READ_KEY = key;
    const guard = new UsageReadGuard();
    for (const authorization of [
      undefined,
      'Basic ignored',
      'Bearer short',
      `Bearer ${'x'.repeat(key.length)}`,
    ]) {
      expect(() => guard.canActivate(contextFor({ authorization }))).toThrow(
        UnauthorizedException,
      );
    }
    expect(
      guard.canActivate(contextFor({ authorization: `Bearer ${key}` })),
    ).toBe(true);
  });
});
