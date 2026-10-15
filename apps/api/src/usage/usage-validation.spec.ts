import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UsageEventDto, UsageSummaryQueryDto } from './usage.dto';
import {
  getUsageDateRange,
  normalizeUsagePath,
  validateUsageFeature,
} from './usage-validation';

const validUsageEvent: UsageEventDto = {
  eventId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  visitorId: 'b5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  sessionId: 'c5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  eventName: 'page_view',
  path: '/ko-KR/game/wordle',
};

describe('usage event validation', () => {
  it('accepts UUID v4 IDs and the duration boundaries', () => {
    for (const durationMs of [undefined, 0, 3600000]) {
      expect(
        validateSync(
          plainToInstance(UsageEventDto, {
            ...validUsageEvent,
            durationMs,
          }),
        ),
      ).toEqual([]);
    }
  });

  it.each([
    ['eventId', 'a5fa93a9-5f91-14f0-9f6e-02e4360a1594'],
    ['visitorId', 'person@example.com'],
    ['sessionId', 'token'],
    ['eventName', 'custom_event'],
    ['feature', 'custom_feature'],
    ['path', '/ko-KR?token=private'],
    ['path', '/ko-KR#private'],
    ['path', `/${'a'.repeat(200)}`],
    ['durationMs', -1],
    ['durationMs', 3600001],
    ['durationMs', 0.5],
  ])('rejects invalid %s: %s', (property, value) => {
    const errors = validateSync(
      plainToInstance(UsageEventDto, {
        ...validUsageEvent,
        [property]: value,
      }),
    );
    expect(errors.map((error) => error.property)).toContain(property);
  });

  it('rejects unrecognized fields instead of accepting arbitrary metadata', () => {
    expect(
      validateSync(
        plainToInstance(UsageEventDto, {
          ...validUsageEvent,
          metadata: { question: 'private' },
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      )[0].property,
    ).toBe('metadata');
  });

  it.each([
    ['/ja-JP', '/ja-JP'],
    ['/en-US/game/wordle/', '/en-US/game/wordle'],
    ['/ko-KR/share/private-token', '/ko-KR/share/:id'],
    ['/ko-KR/hobby/espresso/123', '/ko-KR/hobby/espresso/:id'],
    ['/ko-KR/resume/private-slug', '/ko-KR/resume/:slug'],
    ['/en-US/blog/2026/private-title', '/en-US/blog/:slug'],
    ['/en-US/blog/preview/private-title', '/en-US/blog/preview/:slug'],
    ['/ko-KR/resume/question', '/ko-KR/resume/question'],
    ['/ko-KR/share/:id', '/ko-KR/share/:id'],
    ['/ko-KR/blog/:slug', '/ko-KR/blog/:slug'],
    ['/ko-KR/blog/preview/:slug', '/ko-KR/blog/preview/:slug'],
    ['/ko-KR/resume/:slug', '/ko-KR/resume/:slug'],
    ['/ko-KR/hobby/espresso/:id', '/ko-KR/hobby/espresso/:id'],
  ])('normalizes %s to %s before storing it', (input, output) => {
    expect(normalizeUsagePath(input)).toBe(output);
  });

  it.each([
    '/ko-KR/person@example.com',
    '/ko-KR/access/secret-token',
    '/ko-KR/game/wordle/secret-token',
    '/ko-KR/blog/%70rivate',
    '/ko-KR/share/id/extra',
    '/ko-KR?question=private',
    '/ko-KR/blog/../../secret',
    '/xx-XX/game/wordle',
    'https://example.com/ko-KR',
  ])('rejects unsupported paths: %s', (path) => {
    expect(() => normalizeUsagePath(path)).toThrow(BadRequestException);
  });

  it('requires event-specific features and accepts page views without a feature', () => {
    expect(() => validateUsageFeature(validUsageEvent)).not.toThrow();
    expect(() =>
      validateUsageFeature({
        ...validUsageEvent,
        eventName: 'chat_completed',
        feature: 'main_chat',
      }),
    ).not.toThrow();
    expect(() =>
      validateUsageFeature({ ...validUsageEvent, eventName: 'chat_completed' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateUsageFeature({
        ...validUsageEvent,
        eventName: 'game_started',
        feature: 'main_chat',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('usage summary dates', () => {
  it('converts Korean midnight into UTC with an exclusive ending boundary', () => {
    expect(getUsageDateRange({ from: '2026-10-01', to: '2026-10-02' })).toEqual(
      {
        from: new Date('2026-09-30T15:00:00.000Z'),
        to: new Date('2026-10-01T15:00:00.000Z'),
      },
    );
  });

  it('allows leap days and a maximum of 93 days', () => {
    expect(() =>
      getUsageDateRange({ from: '2024-02-29', to: '2024-03-01' }),
    ).not.toThrow();
    expect(() =>
      getUsageDateRange({ from: '2026-01-01', to: '2026-04-04' }),
    ).not.toThrow();
  });

  it.each([
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-01-01', to: '2026-04-05' },
    { from: '2026-10-02', to: '2026-10-02' },
    { from: '2026-10-03', to: '2026-10-02' },
    { from: '2026-10-01T00:00:00Z', to: '2026-10-02' },
  ])('rejects invalid range %j', (query) => {
    expect(() => getUsageDateRange(query)).toThrow(BadRequestException);
  });

  it('requires both query parameters', () => {
    expect(
      validateSync(plainToInstance(UsageSummaryQueryDto, {})).map(
        (error) => error.property,
      ),
    ).toEqual(['from', 'to']);
  });
});
