import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResumeRagSourceDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  sourcePath: string;

  @ApiProperty()
  sourceKey: string;

  @ApiPropertyOptional()
  sectionPath?: string;

  @ApiPropertyOptional()
  version?: string;

  @ApiPropertyOptional({ type: [String] })
  caveats?: string[];

  @ApiProperty()
  excerpt: string;

  @ApiProperty()
  similarity: number;
}
