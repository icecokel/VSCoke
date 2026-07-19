import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import type { CreatePokeLoungeRoomInput } from './../poke-lounge-room.types';

export class CreatePokeLoungeRoomDto implements CreatePokeLoungeRoomInput {
  @ApiPropertyOptional({ example: 'player-a' })
  @IsOptional()
  @IsString()
  playerId?: string;

  @ApiProperty({ example: 'session-a' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiPropertyOptional({ example: 'user-123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'Player A' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  roundDurationMs?: number;
}
