import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  reportingPlayerId!: string;

  @ApiProperty({ example: 'session-a' })
  reportingSessionId!: string;

  @ApiProperty({ example: 'round-1-match-1' })
  matchId!: string;

  @ApiProperty({ example: 'player-a' })
  winnerPlayerId!: string;

  @ApiProperty({ example: 'player-b' })
  loserPlayerId!: string;

  @ApiProperty({ enum: matchResultReasons, example: 'faint' })
  reason!: PokeLoungeMatchResultReason;

  @ApiPropertyOptional({ example: 1720000003000 })
  nowMs?: number;
}
