import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeekNewsArticleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sourceTopicId: number;

  @ApiProperty()
  topicUrl: string;

  @ApiPropertyOptional({ nullable: true })
  sourceUrl: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional({ nullable: true })
  translatedTitle: string | null;

  @ApiPropertyOptional({ nullable: true })
  translatedContent: string | null;

  @ApiProperty()
  author: string;

  @ApiProperty()
  points: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  rank: number;

  @ApiProperty()
  listedAtText: string;

  @ApiPropertyOptional({ nullable: true })
  postedAt: Date | null;

  @ApiProperty()
  sourceLanguage: string;

  @ApiPropertyOptional({ nullable: true })
  translatedLanguage: string | null;

  @ApiProperty({ enum: ['pending', 'translated', 'failed'] })
  translationStatus: string;

  @ApiPropertyOptional({ nullable: true })
  translationProvider: string | null;

  @ApiPropertyOptional({ nullable: true })
  translationModel: string | null;

  @ApiPropertyOptional({ nullable: true })
  translationError: string | null;

  @ApiPropertyOptional({ nullable: true })
  translatedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
