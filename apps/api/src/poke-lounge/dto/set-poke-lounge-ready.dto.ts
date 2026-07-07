import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SetPokeLoungeReadyDto {
  @ApiProperty({ example: 'player-a' })
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @ApiProperty({ example: 'session-a' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  ready!: boolean;

  @ApiPropertyOptional({ example: 1720000002000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nowMs?: number;
}
