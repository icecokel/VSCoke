import { ApiProperty } from '@nestjs/swagger';
import { ResumeRagSourceDto } from './resume-rag-source.dto';

export class ResumeRagChatResponseDto {
  @ApiProperty()
  answer: string;

  @ApiProperty()
  grounded: boolean;

  @ApiProperty({ type: [ResumeRagSourceDto] })
  sources: ResumeRagSourceDto[];
}
