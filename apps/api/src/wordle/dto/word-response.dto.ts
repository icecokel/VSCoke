import { ApiProperty } from '@nestjs/swagger';

export class WordResponseDto {
  @ApiProperty({
    description: '5글자 영단어',
    example: 'apple',
  })
  word: string;
}
