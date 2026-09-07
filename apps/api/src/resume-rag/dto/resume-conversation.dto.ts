import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import type { ResumeChatChannel } from '../entities/resume-chat-conversation.entity';
import { ResumeRagSourceDto } from './resume-rag-source.dto';

export class CreateResumeConversationDto {
  @ApiProperty({ enum: ['ko-KR', 'en-US', 'ja-JP'] })
  @IsString()
  @IsIn(['ko-KR', 'en-US', 'ja-JP'])
  locale: string;

  @ApiProperty({ enum: ['main', 'resume'] })
  @IsIn(['main', 'resume'])
  channel: ResumeChatChannel;
}

export class ResumeConversationAccessDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    description:
      '대화 생성 시 한 번 반환하는 접근키. URL이나 로그에 기록하지 않는다.',
  })
  token: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt: string;
}

export class ResumeConversationTurnDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  requestId: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  answer: string;

  @ApiProperty()
  grounded: boolean;

  @ApiProperty({ type: [ResumeRagSourceDto] })
  sources: ResumeRagSourceDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class ResumeConversationHistoryDto extends CreateResumeConversationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt: string;

  @ApiProperty({
    type: [ResumeConversationTurnDto],
    description: '최근 50개 질문·답변 쌍',
  })
  turns: ResumeConversationTurnDto[];
}
