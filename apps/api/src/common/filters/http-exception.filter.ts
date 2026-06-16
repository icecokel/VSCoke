import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorMessage } from '../constants/message.constant';

type ExceptionResponseWithMessage = {
  message: unknown;
};

const hasMessage = (value: unknown): value is ExceptionResponseWithMessage =>
  typeof value === 'object' && value !== null && 'message' in value;

/**
 * 전역 예외 필터: 발생하는 모든 예외를 캡처하여 일관된 형식의 응답을 반환함
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * 예외 발생 시 호출되는 메서드
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HTTP 상태 코드 결정
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 에러 메시지 추출
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : ErrorMessage.COMMON.INTERNAL_SERVER_ERROR;

    // HttpException의 getResponse()가 객체일 경우(예: validation pipe) 처리
    const errorMessage = hasMessage(exceptionResponse)
      ? exceptionResponse.message
      : exceptionResponse;

    // 로깅 처리 (500번대 에러는 error로, 그 외는 warn으로 기록)
    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );

      // 알림 전송 (Fire-and-forget)
      this.sendNotification(request, exception).catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send notification: ${errorMessage}`);
      });
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(errorMessage)}`,
      );
    }

    // 통일된 JSON 형식으로 에러 응답 반환
    response.status(status).json({
      success: false,
      statusCode: status,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * 알림 서비스를 통해 상세한 에러 정보를 전송합니다.
   */
  private async sendNotification(request: Request, exception: unknown) {
    const notifyUrl = process.env.NOTIFY_SERVICE_URL;
    const notifyUser = process.env.NOTIFY_SERVICE_USER;
    const notifyPassword = process.env.NOTIFY_SERVICE_PASSWORD;

    if (!notifyUrl || !notifyUser || !notifyPassword) {
      return;
    }

    // 에러 상세 정보 추출
    const errorMessage =
      exception instanceof Error ? exception.message : String(exception);
    const stackTrace =
      exception instanceof Error ? exception.stack : 'No stack trace available';

    // 요청 정보 추출
    const method = request.method;
    const url = request.url;
    const queryParams = JSON.stringify(request.query);
    const body = JSON.stringify(request.body);
    const timestamp = new Date().toISOString();

    // 상세 알림 메시지 포맷
    const notifyMessage = [
      `🚨 **[vscoke-api] Server Error Detected**`,
      ``,
      `**📍 Request Info**`,
      `- **Time**: \`${timestamp}\``,
      `- **Method**: \`${method}\``,
      `- **URL**: \`${url}\``,
      `- **Query**: \`${queryParams}\``,
      `- **Body**: \`\`\`json\n${body}\n\`\`\``,
      ``,
      `**❌ Error Details**`,
      `- **Message**: ${errorMessage}`,
      `- **Stack**:`,
      `\`\`\``,
      stackTrace,
      `\`\`\``,
    ].join('\n');

    const payload = { message: notifyMessage };

    const auth = Buffer.from(`${notifyUser}:${notifyPassword}`).toString(
      'base64',
    );

    const response = await fetch(notifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Notification service responded with ${response.status}`);
    }
  }
}
