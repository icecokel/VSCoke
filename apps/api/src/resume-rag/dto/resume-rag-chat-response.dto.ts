import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResumeRagSourceDto } from './resume-rag-source.dto';

export class ResumeRagChatResponseDto {
  @ApiPropertyOptional({ format: 'uuid' })
  conversationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  requestId?: string;

  @ApiProperty()
  answer: string;

  @ApiProperty()
  grounded: boolean;

  @ApiProperty({ type: [ResumeRagSourceDto] })
  sources: ResumeRagSourceDto[];
}
