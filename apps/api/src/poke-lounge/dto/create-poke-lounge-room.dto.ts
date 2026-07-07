import { ApiPropertyOptional } from '@nestjs/swagger';
import type { CreatePokeLoungeRoomInput } from './../poke-lounge-room.types';

export class CreatePokeLoungeRoomDto implements CreatePokeLoungeRoomInput {
  @ApiPropertyOptional({ example: 'player-a' })
  playerId?: string;

  @ApiPropertyOptional({ example: 'session-a' })
  sessionId?: string;

  @ApiPropertyOptional({ example: 'user-123' })
  userId?: string;

  @ApiPropertyOptional({ example: 'Player A' })
  displayName?: string;

  @ApiPropertyOptional({ example: 60000 })
  roundDurationMs?: number;

  @ApiPropertyOptional({ example: 1720000000000 })
  nowMs?: number;
}
