import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { NotifyTransport } from './notify.transport';

/**
 * Winston 로거 설정 객체
 */
export const winstonConfig = {
  transports: [
    // 콘솔 트랜스포트: 개발 환경에서 가독성 좋은 포맷으로 출력
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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
      maxFiles: '14d',
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
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // 커스텀 알림 트랜스포트: 운영 환경에서 에러 발생 시 외부 알림 전송
    ...(process.env.NODE_ENV === 'production'
      ? [
          new NotifyTransport({
            level: 'error',
          }),
        ]
      : []),
  ],
};
