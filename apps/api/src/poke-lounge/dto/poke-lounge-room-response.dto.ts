import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import type {
  PokeLoungeFinalStanding,
  PokeLoungeMatchResultReason,
  PokeLoungeMatchStatus,
  PokeLoungePartySnapshot,
  PokeLoungeParticipantRole,
  PokeLoungePublicRoomParticipant,
  PokeLoungePublicRoomState,
  PokeLoungeRoomState,
  PokeLoungeRoomStatus,
  PokeLoungeRoundPhase,
  PokeLoungeTournamentMatch,
} from './../poke-lounge-room.types';

const participantRoles: PokeLoungeParticipantRole[] = [
  'participant',
  'spectator',
];
const roomStatuses: PokeLoungeRoomStatus[] = [
  'waiting',
  'round-started',
  'tournament',
  'completed',
  'closed',
];
const roundPhases: PokeLoungeRoundPhase[] = [
  'waiting',
  'round-started',
  'tournament',
  'completed',
];
const matchStatuses: PokeLoungeMatchStatus[] = ['pending', 'completed'];
const matchResultReasons: PokeLoungeMatchResultReason[] = [
  'faint',
  'timeout',
  'forfeit',
  'run',
  'capture',
];
type PokeLoungeRoundState = PokeLoungeRoomState['round'];
type PokeLoungeTournamentState = PokeLoungeRoomState['tournament'];

class PokeLoungeRoomParticipantDto implements PokeLoungePublicRoomParticipant {
  @ApiProperty({ example: 'player-a' })
  playerId!: string;

  @ApiPropertyOptional({ example: 'user-123' })
  userId?: string;

  @ApiProperty({ example: 'Player A' })
  displayName!: string;

  @ApiProperty({ enum: participantRoles, example: 'participant' })
  role!: PokeLoungeParticipantRole;

  @ApiProperty({ example: true })
  ready!: boolean;

  @ApiProperty({ example: true })
  connected!: boolean;

  @ApiProperty({ example: 1720000000000 })
  joinedAtMs!: number;

  @ApiPropertyOptional({ example: 1720000005000 })
  leftAtMs?: number;
}

class PokeLoungeTournamentMatchDto implements PokeLoungeTournamentMatch {
  @ApiProperty({ example: 'round-1-match-1' })
  matchId!: string;

  @ApiProperty({
    type: [String],
    example: ['player-a', 'player-b'],
    minItems: 2,
    maxItems: 2,
  })
  participantIds!: [string, string];

  @ApiProperty({ enum: matchStatuses, example: 'pending' })
  status!: PokeLoungeMatchStatus;

  @ApiPropertyOptional({ example: 'player-a' })
  winnerPlayerId?: string;

  @ApiPropertyOptional({ example: 'player-b' })
  loserPlayerId?: string;

  @ApiPropertyOptional({ enum: matchResultReasons, example: 'faint' })
  resultReason?: PokeLoungeMatchResultReason;

  @ApiPropertyOptional({ example: 1720000060000 })
  completedAtMs?: number;
}

class PokeLoungeFinalStandingDto implements PokeLoungeFinalStanding {
  @ApiProperty({ example: 'player-a' })
  playerId!: string;

  @ApiProperty({ example: 'Player A' })
  displayName!: string;

  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: 100 })
  score!: number;
}

export class PokeLoungeRepresentativePokemonDto implements NonNullable<
  PokeLoungePartySnapshot['representativePokemon']
> {
  @ApiProperty({ example: 25 })
  speciesId!: number;

  @ApiProperty({ example: 'Pikachu' })
  name!: string;

  @ApiProperty({ example: 12 })
  level!: number;

  @ApiProperty({ example: 18 })
  currentHp!: number;

  @ApiProperty({ example: 30 })
  maxHp!: number;
}

export class PokeLoungePartySnapshotDto implements PokeLoungePartySnapshot {
  @ApiProperty({ example: 'player-a' })
  playerId!: string;

  @ApiPropertyOptional({ example: 'Player A' })
  displayName?: string;

  @ApiPropertyOptional({ type: PokeLoungeRepresentativePokemonDto })
  representativePokemon?: PokeLoungeRepresentativePokemonDto;

  @ApiProperty({ example: 1720000002000 })
  updatedAtMs!: number;
}

class PokeLoungeRoundDto implements PokeLoungeRoundState {
  @ApiProperty({ example: 1 })
  index!: number;

  @ApiProperty({ enum: roundPhases, example: 'waiting' })
  phase!: PokeLoungeRoundPhase;

  @ApiProperty({ example: 60000 })
  durationMs!: number;

  @ApiProperty({ example: 1720000000000, nullable: true })
  startedAtMs!: number | null;

  @ApiProperty({ example: 1720000060000, nullable: true })
  endsAtMs!: number | null;
}

class PokeLoungeTournamentDto implements PokeLoungeTournamentState {
  @ApiProperty({ type: [PokeLoungeTournamentMatchDto] })
  matches!: PokeLoungeTournamentMatchDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { 'player-a': 100, 'player-b': 50 },
  })
  cumulativeScores!: Record<string, number>;
}

@ApiExtraModels(PokeLoungePartySnapshotDto, PokeLoungeRepresentativePokemonDto)
export class PokeLoungeRoomResponseDto implements PokeLoungePublicRoomState {
  @ApiProperty({ example: 'ROOM01' })
  roomCode!: string;

  @ApiProperty({ enum: roomStatuses, example: 'waiting' })
  status!: PokeLoungeRoomStatus;

  @ApiProperty({ example: 1720000000000 })
  createdAtMs!: number;

  @ApiProperty({ example: 1720000001000 })
  updatedAtMs!: number;

  @ApiProperty({ type: [PokeLoungeRoomParticipantDto] })
  participants!: PokeLoungeRoomParticipantDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      $ref: '#/components/schemas/PokeLoungePartySnapshotDto',
    },
  })
  partySnapshots!: Record<string, PokeLoungePartySnapshotDto>;

  @ApiProperty({ type: PokeLoungeRoundDto })
  round!: PokeLoungeRoundDto;

  @ApiProperty({ type: PokeLoungeTournamentDto })
  tournament!: PokeLoungeTournamentDto;

  @ApiProperty({ type: [PokeLoungeFinalStandingDto] })
  finalStandings!: PokeLoungeFinalStandingDto[];
}
