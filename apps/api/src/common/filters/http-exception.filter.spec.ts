import {
  BadRequestException,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('실패 로그에 요청 ID와 route template만 기록하고 사용자 입력은 제외한다', () => {
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
    const json = jest.fn();
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
      new BadRequestException('Invalid question'),
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
        success: false,
        statusCode: 400,
        path: '/resume-rag/chat?question=person@example.com',
      }),
    );
    warnSpy.mockRestore();
  });
});
