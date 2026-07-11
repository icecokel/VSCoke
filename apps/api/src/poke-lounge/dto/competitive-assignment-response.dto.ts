import { ApiProperty } from '@nestjs/swagger';
import type {
  CompetitiveAssignmentProjection,
  CompetitiveMatchStatus,
} from '../competitive/competitive-match.types';

export class CompetitiveAssignmentResponseDto implements CompetitiveAssignmentProjection {
  @ApiProperty({ format: 'uuid' })
  matchId!: string;

  @ApiProperty({ minimum: 1 })
  assignmentRevision!: number;

  @ApiProperty({ example: 1 })
  rulesetVersion!: number;

  @ApiProperty({ example: 'a'.repeat(64) })
  rulesetHash!: string;

  @ApiProperty({ minimum: 0 })
  currentTurn!: number;

  @ApiProperty({ enum: ['pending', 'active', 'completed'] })
  status!: CompetitiveMatchStatus;

  @ApiProperty({ type: [String], minItems: 2, maxItems: 2 })
  playerIds!: [string, string];
}
