import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecipeSourceDto } from './recipe-source.dto';

export class RecipeResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: '레시피 ID',
    example: '411b3333-a8b1-414b-bd60-9f538a885614',
  })
  id: string;

  @ApiProperty({ description: '레시피 이름', example: '부타동' })
  name: string;

  @ApiProperty({ type: [String], description: '검색 및 분류 태그' })
  tags: string[];

  @ApiProperty({ type: [String], description: '재료 목록' })
  ingredients: string[];

  @ApiProperty({ type: [String], description: '조리 단계' })
  recipe: string[];

  @ApiPropertyOptional({ type: RecipeSourceDto, description: '레시피 출처' })
  source?: RecipeSourceDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: '생성 시각',
    example: '2026-06-16T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: '수정 시각',
    example: '2026-06-16T12:00:00.000Z',
  })
  updatedAt: Date;
}
