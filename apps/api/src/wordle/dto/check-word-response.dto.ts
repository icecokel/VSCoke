import { ApiProperty } from '@nestjs/swagger';

export class CheckWordResponseDto {
  @ApiProperty({
    description: '단어 존재 여부',
    example: true,
  })
  exists: boolean;
}
