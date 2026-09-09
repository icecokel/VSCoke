import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** HttpExceptionFilter가 보장하는 공통 필드. 도메인 오류는 추가 필드를 가질 수 있다. */
export class ApiErrorResponseDto {
  @ApiProperty({
    type: Boolean,
    enum: [false],
    description: '오류 응답 여부',
    example: false,
  })
  success: false;

  @ApiProperty({
    type: 'integer',
    minimum: 400,
    maximum: 599,
    description: 'HTTP 오류 상태',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: '오류 응답 생성 시각',
    example: '2026-09-10T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '요청 경로. query가 있으면 포함한다.',
    example: '/wordle/check',
  })
  path: string;

  @ApiPropertyOptional({
    description: '오류 설명 또는 입력 검증 오류 목록',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['단어는 반드시 5글자여야 합니다.'],
  })
  message?: string | string[];

  @ApiPropertyOptional({
    description: 'Nest HTTP 오류 이름',
    example: 'Bad Request',
  })
  error?: string;
}
