import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CompetitiveActionProjection } from '../competitive/competitive-action.types';
import type { CompetitiveMatchStatus } from '../competitive/competitive-match.types';

export class CompetitiveActionResponseDto implements CompetitiveActionProjection {
  @ApiProperty()
  matchId!: string;

  @ApiProperty()
  assignmentRevision!: number;

  @ApiProperty()
  submittedTurn!: number;

  @ApiProperty()
  currentTurn!: number;

  @ApiProperty({ enum: ['pending', 'active', 'completed'] })
  status!: CompetitiveMatchStatus;

  @ApiProperty({ type: [String] })
  playerIds!: [string, string];

  @ApiProperty()
  stateHash!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  terminal!: CompetitiveActionProjection['terminal'];
}
