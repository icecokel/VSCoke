import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  hashPokeLoungeRoomCommand,
  type PokeLoungeRoomCommandContext,
  type PokeLoungeRoomOperation,
} from './poke-lounge-room-command';
import {
  PokeLoungeRoomConflict,
  toPokeLoungePublicRoomState,
} from './poke-lounge-room-conflict';
import {
  POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
  type PokeLoungeRoomCommittedEvent,
  type PokeLoungeRoomEventPublisher,
} from './poke-lounge-room-event.publisher';
import { getPokeLoungeRoomExpiresAtMs } from './poke-lounge-room-policy';
import {
  POKE_LOUNGE_ROOM_REPOSITORY,
  type PokeLoungeRepositoryResult,
  type PokeLoungeRoomRepository,
  type PokeLoungeRoomSnapshot,
} from './poke-lounge-room.repository';
import type {
  CreatePokeLoungeRoomInput,
  JoinPokeLoungeRoomInput,
  LeavePokeLoungeRoomInput,
  PokeLoungeFinalStanding,
  PokeLoungeMatchResultReason,
  PokeLoungePartySnapshot,
  PokeLoungePublicRoomState,
  PokeLoungeRoomParticipant,
  PokeLoungeRoomState,
  PokeLoungeTournamentMatch,
  SetPokeLoungeReadyInput,
  SubmitPokeLoungeMatchResultInput,
  UpdatePokeLoungePartySnapshotInput,
} from './poke-lounge-room.types';
import { CompetitiveProjectionService } from './competitive/competitive-projection.service';

const DEFAULT_ROUND_DURATION_MS = 60_000;
const MIN_ROUND_DURATION_MS = 1;
const MAX_ROUND_DURATION_MS = 3_600_000;
const MAX_PARTICIPANTS = 6;
const WIN_SCORE = 100;
const LOSS_SCORE = 50;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MATCH_RESULT_REASONS = new Set<PokeLoungeMatchResultReason>([
  'faint',
  'timeout',
  'forfeit',
  'run',
  'capture',
]);

type MutationInput = {
  operation: Exclude<PokeLoungeRoomOperation, 'create'>;
  roomCode: string;
  actorPlayerId: string;
  command: PokeLoungeRoomCommandContext;
  nowMs: number;
  body: unknown;
  apply: (room: PokeLoungeRoomSnapshot) => PokeLoungeRoomSnapshot;
};

@Injectable()
export class PokeLoungeRoomService {
  private readonly logger = new Logger(PokeLoungeRoomService.name);

  constructor(
    @Inject(POKE_LOUNGE_ROOM_REPOSITORY)
    private readonly repository: PokeLoungeRoomRepository,
    @Inject(POKE_LOUNGE_ROOM_EVENT_PUBLISHER)
    private readonly eventPublisher: PokeLoungeRoomEventPublisher,
    private readonly competitiveProjection: CompetitiveProjectionService,
    @Optional() private readonly roomCodeFactory: () => string = createRoomCode,
    @Optional() private readonly nowFactory: () => number = () => Date.now(),
  ) {}

  async createRoom(
    input: CreatePokeLoungeRoomInput,
    command: PokeLoungeRoomCommandContext,
  ): Promise<PokeLoungeRoomSnapshot> {
    if (command.expectedRevision !== 0) {
      throw new BadRequestException(
        'If-Match-Revision must be 0 when creating a room',
      );
    }

    const normalized = normalizeCreateInput(input);
    const nowMs = this.normalizeNow(input.nowMs);
    const requestHash = hashPokeLoungeRoomCommand({
      operation: 'create',
      body: normalizedCommandBody(normalized, input.nowMs),
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const room: PokeLoungeRoomSnapshot = {
        roomCode: this.roomCodeFactory(),
        status: 'waiting',
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        participants: [createParticipant(normalized, 'participant', nowMs)],
        partySnapshots: {},
        round: {
          index: 1,
          phase: 'waiting',
          durationMs: normalized.roundDurationMs,
          startedAtMs: null,
          endsAtMs: null,
        },
        tournament: {
          matches: [],
          cumulativeScores: {},
        },
        finalStandings: [],
        revision: 0,
        expiresAtMs: 0,
      };
      room.expiresAtMs = getPokeLoungeRoomExpiresAtMs(room);

      const result = await this.repository.create({
        room,
        actorPlayerId: normalized.playerId,
        idempotencyKey: command.idempotencyKey,
        requestHash,
        nowMs,
      });

      if (result.outcome === 'room-code-collision') {
        continue;
      }

      if (result.outcome === 'capacity-reached') {
        throw new BadRequestException('Poke Lounge room capacity reached');
      }

      if (!('snapshot' in result)) {
        continue;
      }

      const snapshot = await this.withCompetitive(result.snapshot);
      if (result.committedChange) {
        await this.publish('room-created', snapshot);
      }

      this.throwForConflict({ ...result, snapshot });

      return structuredClone(snapshot);
    }

    throw new BadRequestException('Unable to create a unique room code');
  }

  async getRoom(
    roomCode: string,
    nowMs?: number,
  ): Promise<PokeLoungeRoomSnapshot> {
    const result = await this.repository.getAndAdvance(
      normalizeRoomCode(roomCode),
      this.normalizeNow(nowMs),
    );

    if (!result.snapshot) {
      throw new NotFoundException('Poke Lounge room not found');
    }

    const snapshot = await this.withCompetitive(result.snapshot);
    if (result.committedChange) {
      await this.publish('room-clock-advanced', snapshot);
    }

    return structuredClone(snapshot);
  }

  async authorizeSubscription(
    roomCode: string,
    playerId: string,
    sessionId: string,
  ): Promise<PokeLoungePublicRoomState> {
    const result = await this.repository.getAndAdvance(
      normalizeRoomCode(roomCode),
      this.normalizeNow(undefined),
    );

    const snapshot = result.snapshot
      ? await this.withCompetitive(result.snapshot)
      : null;
    if (snapshot && result.committedChange) {
      await this.publish('room-clock-advanced', snapshot);
    }

    const participant = snapshot?.participants.find(
      (candidate) => candidate.playerId === playerId,
    );

    if (!snapshot || participant?.sessionId !== sessionId) {
      throw new BadRequestException('Poke Lounge room subscription rejected');
    }

    return structuredClone(toPokeLoungePublicRoomState(snapshot));
  }

  async joinRoom(
    roomCode: string,
    input: JoinPokeLoungeRoomInput,
    command: PokeLoungeRoomCommandContext,
  ): Promise<PokeLoungeRoomSnapshot> {
    const normalized = normalizeJoinInput(input);
    const nowMs = this.normalizeNow(input.nowMs);

    return this.mutateRoom({
      operation: 'join',
      roomCode,
      actorPlayerId:
        normalized.playerId ??
        createAnonymousJoinActorPlayerId(normalized.sessionId),
      command,
      nowMs,
      body: normalizedCommandBody(normalized, input.nowMs),
      apply: (room) => {
        const playerId = normalized.playerId ?? createNextParticipantId(room);
        const existing = room.participants.find(
          (participant) => participant.playerId === playerId,
        );

        if (existing) {
          assertExistingParticipantRejoinable(room);
          assertParticipantSession(
            existing,
            normalized.sessionId,
            'Join sessionId does not match this participant',
          );
          existing.connected = true;
          existing.leftAtMs = undefined;
          existing.ready =
            existing.role === 'participant' ? existing.ready : false;
          room.updatedAtMs = nowMs;
          return room;
        }

        assertRoomJoinable(room);
        const participantCount = room.participants.filter(
          (participant) => participant.role === 'participant',
        ).length;
        const role =
          participantCount < MAX_PARTICIPANTS ? 'participant' : 'spectator';
        room.participants.push(
          createParticipant(
            {
              ...normalized,
              playerId,
              displayName:
                normalized.displayName ?? formatDefaultPlayerName(playerId),
            },
            role,
            nowMs,
          ),
        );
        room.updatedAtMs = nowMs;

        return room;
      },
    });
  }

  async setReady(
    roomCode: string,
    input: SetPokeLoungeReadyInput,
    command: PokeLoungeRoomCommandContext,
  ): Promise<PokeLoungeRoomSnapshot> {
    const normalized = {
      playerId: input.playerId.trim(),
      sessionId: input.sessionId?.trim(),
      ready: input.ready,
    };
    const nowMs = this.normalizeNow(input.nowMs);

    return this.mutateRoom({
      operation: 'ready',
      roomCode,
      actorPlayerId: normalized.playerId,
      command,
      nowMs,
      body: normalizedCommandBody(normalized, input.nowMs),
      apply: (room) => {
        const participant = findParticipant(room, normalized.playerId);
        assertParticipantSession(
          participant,
          normalized.sessionId,
          'Ready sessionId does not match this participant',
        );

        if (participant.role !== 'participant') {
          throw new BadRequestException('Spectators cannot become ready');
        }

        participant.ready = normalized.ready;
        room.updatedAtMs = nowMs;

        if (canStartRound(room)) {
          room.status = 'round-started';
          room.round.phase = 'round-started';
          room.round.startedAtMs = nowMs;
          room.round.endsAtMs = nowMs + room.round.durationMs;
        }

        return room;
      },
    });
  }

  async updatePartySnapshot(
    roomCode: string,
    input: UpdatePokeLoungePartySnapshotInput,
    command: PokeLoungeRoomCommandContext,
  ): Promise<PokeLoungeRoomSnapshot> {
    const normalized = {
      playerId: input.playerId.trim(),
      sessionId: input.sessionId.trim(),
      ...(input.displayName?.trim()
        ? { displayName: input.displayName.trim() }
        : {}),
      ...(input.representativePokemon
        ? {
            representativePokemon: normalizeRepresentativePokemon(
              input.representativePokemon,
            ),
          }
        : {}),
    };
    const nowMs = this.normalizeNow(input.nowMs);

    return this.mutateRoom({
      operation: 'party-snapshot',
      roomCode,
      actorPlayerId: normalized.playerId,
      command,
      nowMs,
      body: normalizedCommandBody(normalized, input.nowMs),
      apply: (room) => {
        const participant = findParticipant(room, normalized.playerId);
        assertParticipantSession(
          participant,
          normalized.sessionId,
          'Party snapshot sessionId does not match this participant',
        );

        if (participant.role !== 'participant') {
          throw new BadRequestException(
            'Spectators cannot update tournament party snapshots',
          );
        }

        room.partySnapshots[participant.playerId] = {
          playerId: participant.playerId,
          ...(normalized.displayName
            ? { displayName: normalized.displayName }
            : participant.displayName
              ? { displayName: participant.displayName }
              : {}),
          ...(normalized.representativePokemon
            ? { representativePokemon: normalized.representativePokemon }
            : {}),
          updatedAtMs: nowMs,
        };
        room.updatedAtMs = nowMs;

        return room;
      },
    });
  }

  async submitMatchResult(
    roomCode: string,
    input: SubmitPokeLoungeMatchResultInput,
    command: PokeLoungeRoomCommandContext,
  ): Promise<PokeLoungeRoomSnapshot> {
    const normalized = {
      reportingPlayerId: input.reportingPlayerId.trim(),
      reportingSessionId: input.reportingSessionId?.trim(),
      matchId: input.matchId.trim(),
      winnerPlayerId: input.winnerPlayerId.trim(),
      loserPlayerId: input.loserPlayerId.trim(),
      reason: input.reason,
    };
    const nowMs = this.normalizeNow(input.nowMs);

    return this.mutateRoom({
      operation: 'result',
      roomCode,
      actorPlayerId: normalized.reportingPlayerId,
      command,
      nowMs,
      body: normalizedCommandBody(normalized, input.nowMs),
      apply: (room) => {
        if (room.status !== 'tournament') {
          throw new BadRequestException(
            'Room is not accepting tournament results',
          );
        }

        const match = findPendingMatch(room, normalized.matchId);
        assertValidMatchResult(room, match, normalized);
        completeMatch(
          room,
          match,
          normalized.winnerPlayerId,
          normalized.loserPlayerId,
          normalized.reason,
          nowMs,
        );

        return room;
      },
    });
  }

  async leaveRoom(
    roomCode: string,
    input: LeavePokeLoungeRoomInput,
    command: PokeLoungeRoomCommandContext,
  ): Promise<PokeLoungeRoomSnapshot> {
    const normalized = {
      playerId: input.playerId?.trim() ?? '',
      sessionId: input.sessionId?.trim(),
    };
    const nowMs = this.normalizeNow(input.nowMs);

    return this.mutateRoom({
      operation: 'leave',
      roomCode,
      actorPlayerId: normalized.playerId,
      command,
      nowMs,
      body: normalizedCommandBody(normalized, input.nowMs),
      apply: (room) => {
        const participant = findParticipant(room, normalized.playerId);
        assertParticipantSession(
          participant,
          normalized.sessionId,
          'Leave sessionId does not match this participant',
        );

        participant.connected = false;
        participant.ready = false;
        participant.leftAtMs = nowMs;
        room.updatedAtMs = nowMs;

        if (room.status === 'waiting') {
          room.participants = room.participants.filter(
            (row) => row.playerId !== normalized.playerId,
          );
          delete room.partySnapshots[normalized.playerId];
        }

        if (participant.role === 'participant') {
          completeParticipantLeaveAsForfeit(room, normalized.playerId, nowMs);
        }

        if (!room.participants.some((row) => row.connected)) {
          room.status = 'closed';
          room.round.phase = 'completed';
        }

        return room;
      },
    });
  }

  private async mutateRoom(
    input: MutationInput,
  ): Promise<PokeLoungeRoomSnapshot> {
    const normalizedRoomCode = normalizeRoomCode(input.roomCode);
    const result = await this.repository.mutate({
      roomCode: normalizedRoomCode,
      actorPlayerId: input.actorPlayerId,
      idempotencyKey: input.command.idempotencyKey,
      requestHash: hashPokeLoungeRoomCommand({
        operation: input.operation,
        roomCode: normalizedRoomCode,
        body: input.body,
      }),
      expectedRevision: input.command.expectedRevision,
      nowMs: input.nowMs,
      apply: input.apply,
    });

    if (!result) {
      throw new NotFoundException('Poke Lounge room not found');
    }

    const snapshot = await this.withCompetitive(result.snapshot);
    const enrichedResult = { ...result, snapshot };
    if (result.committedChange) {
      await this.publish(
        result.outcome === 'committed' ? 'room-updated' : 'room-clock-advanced',
        snapshot,
      );
    }

    this.throwForConflict(enrichedResult);

    return structuredClone(snapshot);
  }

  private throwForConflict(result: PokeLoungeRepositoryResult): void {
    if (result.outcome === 'revision-conflict') {
      throw new PokeLoungeRoomConflict('revision', result.snapshot);
    }

    if (result.outcome === 'idempotency-conflict') {
      throw new PokeLoungeRoomConflict('idempotency', result.snapshot);
    }
  }

  private async publish(
    type: PokeLoungeRoomCommittedEvent['type'],
    snapshot: PokeLoungeRoomSnapshot,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish({
        type,
        snapshot: toPokeLoungePublicRoomState(snapshot),
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish committed Poke Lounge room event for ${snapshot.roomCode}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async withCompetitive(
    snapshot: PokeLoungeRoomSnapshot,
  ): Promise<PokeLoungeRoomSnapshot> {
    const consistent = await this.competitiveProjection.findRoomSnapshot(
      snapshot.roomCode,
    );
    if (!consistent) {
      throw new NotFoundException('Poke Lounge room not found');
    }
    return consistent;
  }

  private normalizeNow(nowMs: number | undefined): number {
    return normalizeNow(nowMs, this.nowFactory);
  }
}

type NormalizedParticipantInput = {
  playerId: string;
  sessionId: string;
  userId?: string;
  displayName: string;
};

type NormalizedJoinInput = Omit<
  NormalizedParticipantInput,
  'playerId' | 'displayName'
> & {
  playerId?: string;
  displayName?: string;
};

type NormalizedCreateInput = NormalizedParticipantInput & {
  roundDurationMs: number;
};

function normalizeCreateInput(
  input: CreatePokeLoungeRoomInput,
): NormalizedCreateInput {
  const playerId = input.playerId?.trim() || 'player-1';

  return {
    playerId,
    sessionId: requireSessionId(input.sessionId),
    ...(input.userId?.trim() ? { userId: input.userId.trim() } : {}),
    displayName: input.displayName?.trim() || formatDefaultPlayerName(playerId),
    roundDurationMs: normalizeRoundDuration(input.roundDurationMs),
  };
}

function normalizeJoinInput(
  input: JoinPokeLoungeRoomInput,
): NormalizedJoinInput {
  const playerId = input.playerId?.trim();

  return {
    ...(playerId ? { playerId } : {}),
    sessionId: requireSessionId(input.sessionId),
    ...(input.userId?.trim() ? { userId: input.userId.trim() } : {}),
    ...(input.displayName?.trim()
      ? { displayName: input.displayName.trim() }
      : {}),
  };
}

function normalizedCommandBody<T extends Record<string, unknown>>(
  normalized: T,
  nowMs: number | undefined,
): T & { nowMs?: number } {
  return {
    ...normalized,
    ...(typeof nowMs === 'number' && Number.isFinite(nowMs)
      ? { nowMs: normalizeNow(nowMs) }
      : {}),
  };
}

function createParticipant(
  input: NormalizedParticipantInput,
  role: PokeLoungeRoomParticipant['role'],
  nowMs: number,
): PokeLoungeRoomParticipant {
  return {
    sessionId: input.sessionId,
    playerId: input.playerId,
    ...(input.userId ? { userId: input.userId } : {}),
    displayName: input.displayName,
    role,
    ready: false,
    connected: true,
    joinedAtMs: nowMs,
  };
}

function createAnonymousJoinActorPlayerId(sessionId: string): string {
  return `join-session-${createHash('sha256').update(sessionId).digest('hex')}`;
}

function createNextParticipantId(room: PokeLoungeRoomState): string {
  const playerIds = new Set(
    room.participants.map((participant) => participant.playerId),
  );

  for (let index = 1; index <= room.participants.length + 1; index += 1) {
    const playerId = `player-${index}`;

    if (!playerIds.has(playerId)) {
      return playerId;
    }
  }

  throw new Error('Unable to allocate Poke Lounge participant id');
}

function requireSessionId(sessionId: string | undefined): string {
  const normalized = sessionId?.trim();

  if (!normalized) {
    throw new BadRequestException('sessionId is required');
  }

  return normalized;
}

function assertParticipantSession(
  participant: PokeLoungeRoomParticipant,
  sessionId: string | undefined,
  message: string,
): void {
  if (!sessionId || participant.sessionId !== sessionId) {
    throw new BadRequestException(message);
  }
}

function findParticipant(
  room: PokeLoungeRoomState,
  playerId: string,
): PokeLoungeRoomParticipant {
  const participant = room.participants.find(
    (candidate) => candidate.playerId === playerId,
  );

  if (!participant) {
    throw new BadRequestException('Player is not in this room');
  }

  return participant;
}

function assertRoomJoinable(room: PokeLoungeRoomState): void {
  if (room.status !== 'waiting') {
    throw new BadRequestException('Room is not joinable');
  }
}

function assertExistingParticipantRejoinable(room: PokeLoungeRoomState): void {
  if (room.status !== 'waiting' && room.status !== 'round-started') {
    throw new BadRequestException('Room is not joinable');
  }
}

function canStartRound(room: PokeLoungeRoomState): boolean {
  if (room.status !== 'waiting' || room.round.phase !== 'waiting') {
    return false;
  }

  const participants = room.participants.filter(
    (participant) =>
      participant.role === 'participant' && participant.connected,
  );

  return (
    participants.length >= 2 &&
    participants.every((participant) => participant.ready)
  );
}

function findPendingMatch(
  room: PokeLoungeRoomState,
  matchId: string,
): PokeLoungeTournamentMatch {
  const match = room.tournament.matches.find(
    (candidate) => candidate.matchId === matchId,
  );

  if (!match) {
    throw new BadRequestException('Match not found');
  }

  if (match.status !== 'pending') {
    throw new BadRequestException('Match result is already completed');
  }

  return match;
}

function assertValidMatchResult(
  room: PokeLoungeRoomState,
  match: PokeLoungeTournamentMatch,
  input: {
    reportingPlayerId: string;
    reportingSessionId?: string;
    winnerPlayerId: string;
    loserPlayerId: string;
    reason: PokeLoungeMatchResultReason;
  },
): void {
  const participantIds = new Set(match.participantIds);

  if (!participantIds.has(input.reportingPlayerId)) {
    throw new BadRequestException(
      'Reporting player is not assigned to this match',
    );
  }

  const reportingParticipant = findParticipant(room, input.reportingPlayerId);
  assertParticipantSession(
    reportingParticipant,
    input.reportingSessionId,
    'Match result sessionId does not match this participant',
  );

  if (!isMatchResultReason(input.reason)) {
    throw new BadRequestException('Unsupported match result reason');
  }

  if (
    !participantIds.has(input.winnerPlayerId) ||
    !participantIds.has(input.loserPlayerId) ||
    input.winnerPlayerId === input.loserPlayerId
  ) {
    throw new BadRequestException(
      'Winner and loser must be match participants',
    );
  }
}

function completeMatch(
  room: PokeLoungeRoomState,
  match: PokeLoungeTournamentMatch,
  winnerPlayerId: string,
  loserPlayerId: string,
  reason: PokeLoungeMatchResultReason,
  nowMs: number,
): void {
  match.status = 'completed';
  match.winnerPlayerId = winnerPlayerId;
  match.loserPlayerId = loserPlayerId;
  match.resultReason = reason;
  match.completedAtMs = nowMs;
  room.tournament.cumulativeScores[winnerPlayerId] =
    (room.tournament.cumulativeScores[winnerPlayerId] ?? 0) + WIN_SCORE;
  room.tournament.cumulativeScores[loserPlayerId] =
    (room.tournament.cumulativeScores[loserPlayerId] ?? 0) + LOSS_SCORE;
  room.updatedAtMs = nowMs;

  if (
    room.tournament.matches.every(
      (candidate) => candidate.status === 'completed',
    )
  ) {
    room.status = 'completed';
    room.round.phase = 'completed';
    room.finalStandings = createFinalStandings(room);
  }
}

function completeParticipantLeaveAsForfeit(
  room: PokeLoungeRoomState,
  playerId: string,
  nowMs: number,
): void {
  if (room.status === 'tournament') {
    const match = room.tournament.matches.find(
      (candidate) =>
        candidate.status === 'pending' &&
        candidate.participantIds.includes(playerId),
    );
    const opponentId = match?.participantIds.find((id) => id !== playerId);

    if (match && opponentId) {
      completeMatch(room, match, opponentId, playerId, 'forfeit', nowMs);
    }

    return;
  }

  if (room.status !== 'round-started') {
    return;
  }

  const opponents = room.participants.filter(
    (participant) =>
      participant.role === 'participant' &&
      participant.connected &&
      participant.playerId !== playerId,
  );

  if (opponents.length !== 1) {
    return;
  }

  const [opponent] = opponents;
  const match: PokeLoungeTournamentMatch = {
    matchId: `round-${room.round.index}-match-${room.tournament.matches.length + 1}`,
    participantIds: createParticipantIdsForForfeit(room, [
      playerId,
      opponent.playerId,
    ]),
    status: 'pending',
  };

  room.status = 'tournament';
  room.round.phase = 'tournament';
  room.tournament.matches.push(match);
  completeMatch(room, match, opponent.playerId, playerId, 'forfeit', nowMs);
}

function createParticipantIdsForForfeit(
  room: PokeLoungeRoomState,
  playerIds: [string, string],
): [string, string] {
  const playerIdSet = new Set(playerIds);
  const orderedIds = room.participants
    .filter((participant) => playerIdSet.has(participant.playerId))
    .sort(
      (left, right) =>
        left.joinedAtMs - right.joinedAtMs ||
        left.playerId.localeCompare(right.playerId),
    )
    .map((participant) => participant.playerId);

  return orderedIds.length === 2 ? [orderedIds[0], orderedIds[1]] : playerIds;
}

function createFinalStandings(
  room: PokeLoungeRoomState,
): PokeLoungeFinalStanding[] {
  return room.participants
    .filter((participant) => participant.role === 'participant')
    .map((participant) => ({
      playerId: participant.playerId,
      displayName: participant.displayName,
      score: room.tournament.cumulativeScores[participant.playerId] ?? 0,
      rank: 0,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.playerId.localeCompare(right.playerId),
    )
    .map((standing, index, standings) => ({
      ...standing,
      rank:
        index > 0 && standings[index - 1].score === standing.score
          ? standings[index - 1].rank
          : index + 1,
    }));
}

function normalizeRepresentativePokemon(
  value: PokeLoungePartySnapshot['representativePokemon'],
): PokeLoungePartySnapshot['representativePokemon'] {
  if (!value) {
    return undefined;
  }

  const speciesId = normalizePositiveInteger(value.speciesId, 'speciesId');
  const level = normalizePositiveInteger(value.level, 'level');
  const currentHp = normalizeNonNegativeInteger(value.currentHp, 'currentHp');
  const maxHp = normalizeNonNegativeInteger(value.maxHp, 'maxHp');

  if (currentHp > maxHp) {
    throw new BadRequestException('currentHp cannot exceed maxHp');
  }

  return {
    speciesId,
    name: value.name,
    level,
    currentHp,
    maxHp,
  };
}

function normalizePositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }

  return value;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }

  return value;
}

function normalizeRoundDuration(roundDurationMs: number | undefined): number {
  if (
    typeof roundDurationMs !== 'number' ||
    !Number.isFinite(roundDurationMs)
  ) {
    return DEFAULT_ROUND_DURATION_MS;
  }

  return Math.max(
    MIN_ROUND_DURATION_MS,
    Math.min(MAX_ROUND_DURATION_MS, Math.floor(roundDurationMs)),
  );
}

function normalizeNow(
  nowMs: number | undefined,
  nowFactory: () => number = () => Date.now(),
): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : nowFactory();
}

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

function isMatchResultReason(
  value: unknown,
): value is PokeLoungeMatchResultReason {
  return (
    typeof value === 'string' &&
    MATCH_RESULT_REASONS.has(value as PokeLoungeMatchResultReason)
  );
}

function formatDefaultPlayerName(playerId: string): string {
  const match = /^player-(\d+)$/.exec(playerId);

  return match ? `Player ${match[1]}` : playerId;
}

function createRoomCode(): string {
  return Array.from({ length: 6 }, () => {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);

    return ROOM_CODE_ALPHABET[index];
  }).join('');
}
