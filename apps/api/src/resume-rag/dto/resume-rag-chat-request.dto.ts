import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';

export class ResumeRagChatRequestDto {
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
