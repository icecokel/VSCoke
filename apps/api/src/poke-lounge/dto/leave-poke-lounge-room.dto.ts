import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LeavePokeLoungeRoomInput } from './../poke-lounge-room.types';

export class LeavePokeLoungeRoomDto implements LeavePokeLoungeRoomInput {
  @ApiProperty({ example: 'player-a' })
  playerId!: string;

  @ApiProperty({ example: 'session-a' })
  sessionId!: string;

  @ApiPropertyOptional({ example: 1720000004000 })
  nowMs?: number;
}
