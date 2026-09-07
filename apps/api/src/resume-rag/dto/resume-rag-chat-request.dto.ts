import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  Length,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class ResumeRagChatRequestDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: '생성한 대화 ID. 접근키 헤더와 함께 전달한다.',
  })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: '대화 요청 시 필수. 재시도에는 같은 UUID를 사용한다.',
  })
  @ValidateIf(
    (request: ResumeRagChatRequestDto) =>
      request.conversationId !== undefined || request.requestId !== undefined,
  )
  @IsUUID('4')
  requestId?: string;

  @ApiProperty({
    example: '어떤 의료 도메인 프로젝트 경험이 있나요?',
    minLength: 2,
    maxLength: 1000,
  })
  @IsString()
  @Length(2, 1000)
  question: string;

  @ApiProperty({ example: 'ko-KR', enum: ['ko-KR', 'en-US', 'ja-JP'] })
  @IsString()
  @IsIn(['ko-KR', 'en-US', 'ja-JP'])
  locale: string;
}
