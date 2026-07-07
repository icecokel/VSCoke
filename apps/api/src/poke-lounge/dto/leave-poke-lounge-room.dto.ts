import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import type { LeavePokeLoungeRoomInput } from './../poke-lounge-room.types';

export class LeavePokeLoungeRoomDto implements LeavePokeLoungeRoomInput {
  @ApiProperty({ example: 'player-a' })
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @ApiProperty({ example: 'session-a' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiPropertyOptional({ example: 1720000004000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nowMs?: number;
}
