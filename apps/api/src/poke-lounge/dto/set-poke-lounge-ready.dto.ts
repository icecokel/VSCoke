import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetPokeLoungeReadyDto {
  @ApiPropertyOptional({ example: 'player-a' })
  playerId?: string;

  @ApiProperty({ example: true })
  ready!: boolean;

  @ApiPropertyOptional({ example: 1720000002000 })
  nowMs?: number;
}
