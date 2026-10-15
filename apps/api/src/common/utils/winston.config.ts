import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { requestLogContext } from '../logging/request-log-context';
import { redactSensitiveValue } from './redact-sensitive';

const logLevels = [
  'error',
  'warn',
  'info',
  'http',
  'verbose',
  'debug',
  'silly',
] as const;

export const resolveLogLevel = (
  env: Record<string, string | undefined> = process.env,
): string => {
  const level = env.LOG_LEVEL?.trim().toLowerCase();
  if (!level) return env.NODE_ENV === 'production' ? 'info' : 'debug';
  if (!logLevels.some((candidate) => candidate === level)) {
    throw new Error(
      'Invalid LOG_LEVEL: expected error, warn, info, http, verbose, debug, or silly',
    );
  }
  return level;
};

/**
 * Winston 로거 설정 객체
 */
export const createWinstonConfig = () => {
  const logLevel = resolveLogLevel();

  return {
    level: logLevel,
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format((info) => {
        if (typeof info.message === 'string' && info.message.startsWith('{')) {
          try {
            const parsed: unknown = JSON.parse(info.message);
            if (
              parsed &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed)
            ) {
              Object.assign(info, parsed, {
                level: info.level,
                message:
                  'message' in parsed
                    ? parsed.message
                    : 'event' in parsed
                      ? parsed.event
                      : 'structured log',
              });
            }
          } catch {
            // JSON이 아닌 기존 로그 메시지는 문자열로 유지한다.
          }
        }
        const requestId = requestLogContext.getStore()?.requestId;
        if (requestId && !info.requestId) info.requestId = requestId;
        if (!info.message && typeof info.event === 'string') {
          info.message = info.event;
        }
        Object.assign(info, redactSensitiveValue(info));
        return info;
      })(),
    ),
    transports: [
      // 콘솔 트랜스포트: 개발 환경에서 가독성 좋은 포맷으로 출력
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonUtilities.format.nestLike('VSCoke', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),

      // 파일 트랜스포트: 에러 로그만 분리하여 저장
      new DailyRotateFile({
        level: 'error',
        dirname: 'logs',
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '180d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),

      // 파일 트랜스포트: 모든 레벨의 로그를 통합 저장
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '180d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
};

export const winstonConfig = createWinstonConfig();
