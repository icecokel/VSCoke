import {
  BadRequestException,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

const createContext = () => {
  const request = {
    method: 'POST',
    url: '/main-chat?question=private-query',
    baseUrl: '',
    route: { path: '/main-chat' },
    requestId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  } as unknown as Request;
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const response = { status, json } as unknown as Response;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
  return { status, json, host };
};

const originalEnv = process.env;

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NOTIFY_SERVICE_URL;
    delete process.env.NOTIFY_SERVICE_USER;
    delete process.env.NOTIFY_SERVICE_PASSWORD;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  it('구조화된 예외 응답을 보존하고 로그에서는 사용자 입력을 제외한다', () => {
    const request = {
      method: 'POST',
      url: '/resume-rag/chat?question=person@example.com',
      baseUrl: '/resume-rag',
      route: { path: '/chat' },
      requestId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
      requestStartedAt: process.hrtime.bigint(),
      query: { question: 'person@example.com' },
      body: { question: 'person@example.com' },
    } as unknown as Request;
    const status = jest.fn().mockReturnThis();
    let responseBody: unknown;
    const json = jest.fn((body: unknown) => {
      responseBody = body;
    });
    const response = { status, json } as unknown as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;
    let logMessage: unknown;
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((message: unknown) => {
        logMessage = message;
      });

    new HttpExceptionFilter().catch(
      new BadRequestException({
        code: 'STRUCTURED_ERROR',
        message: 'Invalid question',
        snapshot: { revision: 7 },
        success: true,
        statusCode: 418,
        timestamp: 'forged-timestamp',
        path: '/forged-path',
      }),
      host,
    );

    expect(logMessage).not.toContain('person@example.com');
    expect(JSON.parse(String(logMessage))).toMatchObject({
      event: 'api.error',
      requestId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
      method: 'POST',
      route: '/resume-rag/chat',
      statusCode: 400,
    });
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'STRUCTURED_ERROR',
        message: 'Invalid question',
        snapshot: { revision: 7 },
        success: false,
        statusCode: 400,
        requestId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
        path: '/resume-rag/chat?question=person@example.com',
      }),
    );
    expect(responseBody).not.toEqual(
      expect.objectContaining({ timestamp: 'forged-timestamp' }),
    );
    warnSpy.mockRestore();
  });

  it('body parser 크기 초과는 본문 노출과 서버 알림 없이 413이다', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new global.Response());
    process.env.NOTIFY_SERVICE_URL = 'https://notify.example.test/send';
    process.env.NOTIFY_SERVICE_USER = 'notify';
    process.env.NOTIFY_SERVICE_PASSWORD = 'secret';
    const { status, json, host } = createContext();
    const exception = Object.assign(new Error('private body content'), {
      type: 'entity.too.large',
      status: 413,
      body: 'private-body',
    });
    new HttpExceptionFilter().catch(exception, host);
    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 413 }),
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain(
      'private body content',
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain('private-body');
    expect(warn).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('서버 오류의 유형과 메시지, 스택을 기록하며 비밀과 URL 쿼리는 가린다', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { status, json, host } = createContext();
    const error = new TypeError(
      'Failed https://user:private-password@example.test/api?token=private-token ' +
        'for person@example.com Basic c2VjcmV0',
    );

    new HttpExceptionFilter().catch(error, host);

    const message = String(errorSpy.mock.calls[0]?.[0]);
    const log = JSON.parse(message) as { message: string; stack: string };
    expect(log).toMatchObject({
      event: 'api.error',
      errorName: 'TypeError',
      requestId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
    });
    expect(log.message).toContain('example.test/api');
    expect(log.stack).toContain('TypeError');
    expect(message).not.toMatch(
      /private-password|private-token|private-query|person@example.com|c2VjcmV0/,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 500 }),
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain('TypeError');
  });

  it('Error가 아닌 순환 객체가 던져져도 입력을 기록하지 않고 500을 반환한다', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { status, host } = createContext();
    const exception: Record<string, unknown> = { private: 'private-input' };
    exception.circular = exception;

    expect(() =>
      new HttpExceptionFilter().catch(exception, host),
    ).not.toThrow();

    expect(status).toHaveBeenCalledWith(500);
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain('private-input');
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      errorName: 'NonErrorException',
    });
  });

  it('알림 실패는 요청 ID로 연결하고 민감 값을 가리며 원래 응답은 보존한다', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    process.env.NOTIFY_SERVICE_URL = 'https://notify.example.test/send';
    process.env.NOTIFY_SERVICE_USER = 'notify-user';
    process.env.NOTIFY_SERVICE_PASSWORD = 'notify-password';
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(
        new Error('Failed https://notify.example.test?token=private-token'),
      );
    const { status, host } = createContext();

    new HttpExceptionFilter().catch(new Error('Server failure'), host);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(status).toHaveBeenCalledWith(500);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    const message = String(errorSpy.mock.calls[1]?.[0]);
    expect(JSON.parse(message)).toMatchObject({
      event: 'api.notification.failed',
      requestId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
    });
    expect(message).not.toContain('private-token');
  });
});
