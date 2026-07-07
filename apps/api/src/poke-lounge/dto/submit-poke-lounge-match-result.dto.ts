import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type {
  PokeLoungeMatchResultReason,
  SubmitPokeLoungeMatchResultInput,
} from './../poke-lounge-room.types';

const matchResultReasons: PokeLoungeMatchResultReason[] = [
  'faint',
  'timeout',
  'forfeit',
  'run',
  'capture',
];

export class SubmitPokeLoungeMatchResultDto implements SubmitPokeLoungeMatchResultInput {
  @ApiProperty({ example: 'player-a' })
  @IsString()
  @IsNotEmpty()
  reportingPlayerId!: string;

  @ApiProperty({ example: 'session-a' })
  @IsString()
  @IsNotEmpty()
  reportingSessionId!: string;

  @ApiProperty({ example: 'round-1-match-1' })
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @ApiProperty({ example: 'player-a' })
  @IsString()
  @IsNotEmpty()
  winnerPlayerId!: string;

  @ApiProperty({ example: 'player-b' })
  @IsString()
  @IsNotEmpty()
  loserPlayerId!: string;

  @ApiProperty({ enum: matchResultReasons, example: 'faint' })
  @IsIn(matchResultReasons)
  reason!: PokeLoungeMatchResultReason;

  @ApiPropertyOptional({ example: 1720000003000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nowMs?: number;
}
