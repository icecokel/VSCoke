import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { createApiRequestLog } from '../logging/api-request-log';
import { requestLogContext } from '../logging/request-log-context';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithRequestId = Request & {
  requestId?: string;
  requestStartedAt?: bigint;
};

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const logger = new Logger('ApiAccessLog');

const getIncomingRequestId = (request: Request): string | undefined => {
  const header = request.headers[REQUEST_ID_HEADER];

  return typeof header === 'string' && REQUEST_ID_PATTERN.test(header)
    ? header
    : undefined;
};

export const requestIdMiddleware = (
  request: RequestWithRequestId,
  response: Response,
  next: NextFunction,
): void => {
  const requestId = getIncomingRequestId(request) ?? randomUUID();

  request.requestId = requestId;
  request.requestStartedAt = process.hrtime.bigint();
  response.setHeader('X-Request-Id', requestId);
  let hasLogged = false;
  const logCompletion = (outcome: 'completed' | 'aborted'): void => {
    if (hasLogged) return;
    hasLogged = true;
    const statusCode =
      outcome === 'aborted' && !response.headersSent
        ? 499
        : response.statusCode;
    const message = JSON.stringify(
      createApiRequestLog(request, statusCode, response, outcome),
    );
    if (statusCode >= 500) logger.error(message);
    else if (statusCode >= 400 || outcome === 'aborted') logger.warn(message);
    else logger.log(message);
  };
  response.once('finish', () => logCompletion('completed'));
  response.once('close', () => {
    logCompletion(response.writableFinished ? 'completed' : 'aborted');
  });
  requestLogContext.run({ requestId }, next);
};
