import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional } from 'class-validator';

export class SavePokeLoungeStateDto {
  @ApiProperty({
    description: 'Poke Lounge 클라이언트의 현재 저장 상태',
    type: 'object',
    additionalProperties: true,
    example: {
      trainer: { x: 12, y: 3 },
      party: ['pikachu', 'eevee'],
    },
  })
  @IsObject()
  state: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '클라이언트 기준 상태 갱신 시각',
    example: '2026-07-08T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;
}
