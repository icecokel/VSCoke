import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { resolveCorsOrigins } from '../utils/cors.util';
import { redactSensitiveValue } from '../utils/redact-sensitive';
import {
  PublicChatRateLimitStore,
  enforcePublicChatRateLimit,
} from '../rate-limit/public-chat-rate-limit';
import type { ExecutionContext, CanActivate } from '@nestjs/common';
import { ClientErrorDto } from './client-error.dto';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

const stripUrlParameters = (value: string): string =>
  value.replace(/https?:\/\/[^\s)]+/gi, (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return '[URL]';
    }
  });

export class ClientErrorRateLimitGuard implements CanActivate {
  private readonly store = new PublicChatRateLimitStore(60);

  canActivate(context: ExecutionContext): boolean {
    return enforcePublicChatRateLimit(
      context,
      this.store,
      '오류 보고 요청이 너무 많습니다.',
    );
  }
}

@ApiTags('Observability')
@Controller('client-errors')
@ApiInternalServerErrorResponse({
  description: '분류되지 않은 서버 오류',
  type: ApiErrorResponseDto,
})
export class ClientErrorController {
  private readonly logger = new Logger(ClientErrorController.name);

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ClientErrorRateLimitGuard)
  @ApiOperation({ summary: '웹 오류를 운영 로그에 기록' })
  @ApiAcceptedResponse({ description: '오류 보고가 로그에 기록됨' })
  @ApiBadRequestResponse({
    description: '유효하지 않은 오류 보고',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '허용되지 않은 브라우저 origin',
    type: ApiErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: '오류 보고 횟수 제한',
    type: ApiErrorResponseDto,
  })
  report(@Body() body: ClientErrorDto, @Req() request: Request): void {
    const origin = request.headers.origin;
    const allowedOrigins = resolveCorsOrigins(process.env.CORS_ORIGINS);

    // 브라우저 이벤트는 허용된 사이트에서만 받는다. Next 서버의 전달 요청은 Origin이 없다.
    if (origin && !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('허용되지 않은 오류 보고 origin입니다.');
    }

    const safeMessage = redactSensitiveValue(stripUrlParameters(body.message));
    const safeStack = body.stack
      ? redactSensitiveValue(stripUrlParameters(body.stack))
      : undefined;

    this.logger.error(
      JSON.stringify({
        event: 'web.error',
        eventId: body.eventId,
        reportRequestId: (request as Request & { requestId?: string })
          .requestId,
        relatedRequestId: body.relatedRequestId,
        source: body.source,
        kind: body.kind,
        path: redactSensitiveValue(body.path),
        errorName: redactSensitiveValue(body.errorName),
        message: safeMessage,
        stack: safeStack,
        statusCode: body.statusCode,
      }),
    );
  }
}
