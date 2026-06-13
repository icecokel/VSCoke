import { ApiProperty } from '@nestjs/swagger';
import { GeekNewsArticleResponseDto } from './geeknews-article-response.dto';

export class GeekNewsSyncResponseDto {
  @ApiProperty({ enum: ['completed', 'skipped'] })
  status: string;

  @ApiProperty({ required: false, nullable: true })
  reason?: string;

  @ApiProperty()
  crawledPages: number;

  @ApiProperty()
  crawledTopics: number;

  @ApiProperty()
  createdTopics: number;

  @ApiProperty()
  updatedTopics: number;

  @ApiProperty()
  skippedTopics: number;

  @ApiProperty()
  translatedTopics: number;

  @ApiProperty()
  pendingTopics: number;

  @ApiProperty()
  failedTopics: number;

  @ApiProperty({ type: [GeekNewsArticleResponseDto] })
  articles: GeekNewsArticleResponseDto[];
}
