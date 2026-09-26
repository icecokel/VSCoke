import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { GAME_IDS } from './beat-jev.types';
import type { GameId, GameResult, Side } from './beat-jev.types';

export class RevisionDto {
  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  revision: number;
}

export class GameActionDto extends RevisionDto {
  @ApiProperty({ example: 'column:2', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  action: string;
}

export class BeatJevGameViewDto {
  @ApiProperty({ enum: GAME_IDS, enumName: 'BeatJevGameId' })
  gameId: GameId;

  @ApiProperty({ enum: ['PLAYER', 'JEV'] })
  turn: Side;

  @ApiProperty({ enum: ['PLAYER', 'JEV', 'DRAW'], nullable: true })
  result: GameResult;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Record<string, unknown>;

  @ApiProperty({ type: [String] })
  legalActions: string[];
}

export class BeatJevRoundHistoryDto {
  @ApiProperty({ enum: GAME_IDS, enumName: 'BeatJevGameId' })
  gameId: GameId;

  @ApiProperty({ enum: ['PLAYER', 'JEV', 'DRAW'] })
  result: Exclude<GameResult, null>;
}

export class BeatJevMatchDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ minimum: 0 })
  revision: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', enum: [...GAME_IDS], nullable: true },
  })
  games: (GameId | null)[];

  @ApiProperty({ minimum: 0, maximum: 2 })
  gameIndex: number;

  @ApiProperty({ minimum: 0, maximum: 2 })
  playerWins: number;

  @ApiProperty({ minimum: 0, maximum: 2 })
  jevWins: number;

  @ApiProperty({ enum: ['PLAYING', 'ROUND_END', 'COMPLETE'] })
  status: 'PLAYING' | 'ROUND_END' | 'COMPLETE';

  @ApiProperty({ type: BeatJevGameViewDto })
  game: BeatJevGameViewDto;

  @ApiProperty({ type: [BeatJevRoundHistoryDto] })
  history: BeatJevRoundHistoryDto[];
}
