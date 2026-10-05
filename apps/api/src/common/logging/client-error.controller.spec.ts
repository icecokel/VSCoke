import { ForbiddenException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request } from 'express';
import { ClientErrorController } from './client-error.controller';
import { ClientErrorDto } from './client-error.dto';

const event = {
  eventId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  source: 'browser' as const,
  kind: 'runtime' as const,
  path: '/ko-KR/game/wordle',
  errorName: 'TypeError',
  message:
    'Failure at https://api.icecoke.kr/game?token=secret for person@example.com',
  stack: 'TypeError: https://api.icecoke.kr/game?token=secret',
  relatedRequestId: 'b5fa93a9-5f91-44f0-9f6e-02e4360a1594',
};

describe('ClientErrorController', () => {
  it('웹 오류를 요청 ID와 함께 기록하고 URL 파라미터와 이메일을 제거한다', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const request = {
      headers: { origin: 'https://vscoke.icecoke.kr' },
      requestId: 'c5fa93a9-5f91-44f0-9f6e-02e4360a1594',
    } as unknown as Request;

    new ClientErrorController().report(event, request);

    const log = JSON.parse(String(errorSpy.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;
    expect(log).toMatchObject({
      event: 'web.error',
      eventId: event.eventId,
      reportRequestId: 'c5fa93a9-5f91-44f0-9f6e-02e4360a1594',
      relatedRequestId: event.relatedRequestId,
      source: 'browser',
      path: event.path,
    });
    expect(JSON.stringify(log)).not.toContain('token=secret');
    expect(JSON.stringify(log)).not.toContain('person@example.com');
    errorSpy.mockRestore();
  });

  it('허용되지 않은 Origin은 기록하지 않는다', () => {
    const request = {
      headers: { origin: 'https://other.example.com' },
    } as Request;

    expect(() => new ClientErrorController().report(event, request)).toThrow(
      ForbiddenException,
    );
  });

  it('오류 보고 계약은 경로의 query와 긴 payload를 거부한다', () => {
    const invalid = plainToInstance(ClientErrorDto, {
      ...event,
      path: '/game?question=private',
      message: 'x'.repeat(501),
    });

    expect(validateSync(invalid).map((error) => error.property)).toEqual(
      expect.arrayContaining(['path', 'message']),
    );
  });
});
