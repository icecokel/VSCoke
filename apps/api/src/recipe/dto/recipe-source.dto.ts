import { ApiProperty } from '@nestjs/swagger';

export class RecipeSourceDto {
  @ApiProperty({
    description: '레시피 출처 유형',
    example: 'notion',
  })
  type: string;

  @ApiProperty({
    description: '레시피 원문 URL',
    example: 'https://www.notion.so/example',
  })
  url: string;
}
