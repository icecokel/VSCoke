import { ApiPropertyOptional } from '@nestjs/swagger';
import type { JoinPokeLoungeRoomInput } from './../poke-lounge-room.types';

export class JoinPokeLoungeRoomDto implements JoinPokeLoungeRoomInput {
  @ApiPropertyOptional({ example: 'player-b' })
  playerId?: string;

  @ApiPropertyOptional({ example: 'session-b' })
  sessionId?: string;

  @ApiPropertyOptional({ example: 'user-456' })
  userId?: string;

  @ApiPropertyOptional({ example: 'Player B' })
  displayName?: string;

  @ApiPropertyOptional({ example: 1720000001000 })
  nowMs?: number;
}
