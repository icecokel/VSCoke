import { Logger } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { requestLogContext } from '../logging/request-log-context';
import {
  requestIdMiddleware,
  type RequestWithRequestId,
} from './request-id.middleware';

type TestResponse = {
  response: Response;
  setHeader: jest.Mock;
  once: jest.Mock;
  getFinishListener: () => (() => void) | undefined;
  getCloseListener: () => (() => void) | undefined;
};

const createRequest = (
  headers: Record<string, string> = {},
): RequestWithRequestId => ({ headers }) as RequestWithRequestId;

const createResponse = (): TestResponse => {
  const setHeader = jest.fn();
  let finishListener: (() => void) | undefined;
  let closeListener: (() => void) | undefined;
  const once = jest.fn((event: string, listener: () => void) => {
    if (event === 'finish') {
      finishListener = listener;
    }
    if (event === 'close') closeListener = listener;
  });

  return {
    response: {
      setHeader,
      once,
      getHeader: jest.fn(),
      statusCode: 200,
      headersSent: false,
      writableFinished: false,
    } as unknown as Response,
    setHeader,
    once,
    getFinishListener: () => finishListener,
    getCloseListener: () => closeListener,
  };
};

describe('requestIdMiddleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it('유효한 요청 ID를 응답 헤더와 로그 컨텍스트에 전파한다', () => {
    const requestId = 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594';
    const request = createRequest({ 'x-request-id': requestId });
    const testResponse = createResponse();
    const next: NextFunction = jest.fn();

    requestIdMiddleware(request, testResponse.response, next);

    expect(request.requestId).toBe(requestId);
    expect(typeof request.requestStartedAt).toBe('bigint');
    expect(testResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      requestId,
    );
    expect(testResponse.once).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('유효하지 않은 요청 ID 대신 새 UUID를 생성한다', () => {
    const request = createRequest({ 'x-request-id': 'untrusted-value' });
    const testResponse = createResponse();

    requestIdMiddleware(request, testResponse.response, jest.fn());

    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(testResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      request.requestId,
    );
  });

  it('응답 완료 시 구조화된 access log를 기록한다', () => {
    const request = createRequest();
    Object.assign(request, {
      method: 'GET',
      baseUrl: '/health',
      route: { path: '' },
    });
    const testResponse = createResponse();
    Object.assign(testResponse.response, { statusCode: 200 });
    let logMessage: unknown;
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message: unknown) => {
        logMessage = message;
      });

    requestIdMiddleware(request, testResponse.response, jest.fn());

    testResponse.getFinishListener()?.();

    const log: unknown = JSON.parse(String(logMessage));
    expect(log).toMatchObject({
      event: 'api.request',
      requestId: request.requestId,
      method: 'GET',
      route: '/health',
      statusCode: 200,
      outcome: 'completed',
    });
    const durationMs = (log as Record<string, unknown>).durationMs;
    expect(typeof durationMs).toBe('number');
    logSpy.mockRestore();
  });

  it('finish 이후 close가 발생해도 완료 로그를 한 번만 기록한다', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const testResponse = createResponse();

    requestIdMiddleware(createRequest(), testResponse.response, jest.fn());
    testResponse.getFinishListener()?.();
    testResponse.getCloseListener()?.();

    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('응답 전 연결 종료는 499와 aborted로 한 번 기록한다', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const testResponse = createResponse();

    requestIdMiddleware(createRequest(), testResponse.response, jest.fn());
    testResponse.getCloseListener()?.();
    testResponse.getFinishListener()?.();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(warnSpy.mock.calls[0]?.[0]))).toMatchObject({
      event: 'api.request',
      statusCode: 499,
      outcome: 'aborted',
    });
  });

  it.each([
    [400, 'warn'],
    [500, 'error'],
  ] as const)('실패 상태 %i를 %s 레벨로 기록한다', (statusCode, level) => {
    const spy = jest.spyOn(Logger.prototype, level).mockImplementation();
    const testResponse = createResponse();
    testResponse.response.statusCode = statusCode;

    requestIdMiddleware(createRequest(), testResponse.response, jest.fn());
    testResponse.getFinishListener()?.();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({
      statusCode,
      outcome: 'completed',
    });
  });

  it('비동기 작업에 요청 컨텍스트를 전파하고 동시 요청끼리 격리한다', async () => {
    const requestIds = [
      'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
      'b5fa93a9-5f91-44f0-9f6e-02e4360a1594',
    ];
    const contexts = await Promise.all(
      requestIds.map(
        (requestId) =>
          new Promise<string | undefined>((resolve) => {
            requestIdMiddleware(
              createRequest({ 'x-request-id': requestId }),
              createResponse().response,
              () => {
                setImmediate(() =>
                  resolve(requestLogContext.getStore()?.requestId),
                );
              },
            );
          }),
      ),
    );

    expect(contexts).toEqual(requestIds);
    expect(requestLogContext.getStore()).toBeUndefined();
  });
});
