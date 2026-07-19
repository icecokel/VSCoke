import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import type { CompetitiveActionProjection } from '../competitive/competitive-action.types';
import type {
  CompetitiveMatchKind,
  CompetitiveMatchStatus,
} from '../competitive/competitive-match.types';

class CompetitiveMoveStateDto {
  @ApiProperty()
  moveId!: string;

  @ApiProperty({ minimum: 0 })
  pp!: number;
}

class CompetitiveCombatantStateDto {
  @ApiProperty()
  speciesId!: string;

  @ApiProperty({ minimum: 1 })
  maxHp!: number;

  @ApiProperty({ minimum: 0 })
  currentHp!: number;

  @ApiProperty({ enum: ['none', 'paralyzed'] })
  status!: 'none' | 'paralyzed';

  @ApiProperty({ type: [CompetitiveMoveStateDto] })
  moves!: CompetitiveMoveStateDto[];
}

class CompetitivePlayerStateDto {
  @ApiProperty()
  playerId!: string;

  @ApiProperty({ minimum: 0 })
  activeSlotIndex!: number;

  @ApiProperty({ type: [CompetitiveCombatantStateDto] })
  team!: CompetitiveCombatantStateDto[];
}

class CompetitiveTerminalResultDto {
  @ApiProperty()
  winnerPlayerId!: string;

  @ApiProperty()
  loserPlayerId!: string;

  @ApiProperty({ enum: ['faint', 'forfeit', 'timeout'] })
  reason!: 'faint' | 'forfeit' | 'timeout';

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number', enum: [50, 100] },
  })
  scoreByPlayerId!: Record<string, 50 | 100>;
}

class CompetitiveBattleStateDto {
  @ApiProperty({ example: 1 })
  rulesetVersion!: 1;

  @ApiProperty({ minimum: 0 })
  turn!: number;

  @ApiProperty({ type: [String], minItems: 2, maxItems: 2 })
  participantIds!: [string, string];

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(CompetitivePlayerStateDto) },
  })
  playersById!: Record<string, CompetitivePlayerStateDto>;

  @ApiProperty({ type: CompetitiveTerminalResultDto, nullable: true })
  terminal!: CompetitiveTerminalResultDto | null;
}

@ApiExtraModels(
  CompetitiveMoveStateDto,
  CompetitiveCombatantStateDto,
  CompetitivePlayerStateDto,
  CompetitiveTerminalResultDto,
  CompetitiveBattleStateDto,
)
export class CompetitiveActionResponseDto implements CompetitiveActionProjection {
  @ApiProperty()
  matchId!: string;

  @ApiProperty({ example: 'game-round-1-bracket-1-match-1' })
  bracketMatchId!: string;

  @ApiProperty({
    enum: ['ranked-head-to-head', 'tournament-unranked'],
  })
  kind!: CompetitiveMatchKind;

  @ApiProperty()
  assignmentRevision!: number;

  @ApiProperty()
  rulesetVersion!: number;

  @ApiProperty()
  rulesetHash!: string;

  @ApiProperty()
  currentTurn!: number;

  @ApiProperty({ enum: ['pending', 'active', 'completed'] })
  status!: CompetitiveMatchStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  terminalEventId!: string | null;

  @ApiProperty({ type: Number, minimum: 0, nullable: true })
  terminalRoomRevision!: number | null;

  @ApiProperty({ type: [String] })
  playerIds!: [string, string];

  @ApiProperty()
  stateHash!: string;

  @ApiProperty({ type: CompetitiveBattleStateDto })
  currentState!: CompetitiveActionProjection['currentState'];

  @ApiProperty({ type: [String] })
  submittedPlayerIds!: string[];

  @ApiProperty({ type: CompetitiveTerminalResultDto, nullable: true })
  terminal!: CompetitiveActionProjection['terminal'];
}
