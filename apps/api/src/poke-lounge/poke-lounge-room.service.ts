import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type {
  CreatePokeLoungeRoomInput,
  JoinPokeLoungeRoomInput,
  PokeLoungeFinalStanding,
  PokeLoungePartySnapshot,
  PokeLoungeMatchResultReason,
  PokeLoungeRoomParticipant,
  PokeLoungeRoomState,
  PokeLoungeTournamentMatch,
  SubmitPokeLoungeMatchResultInput,
  UpdatePokeLoungePartySnapshotInput,
} from './poke-lounge-room.types';

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

@Injectable()
export class PokeLoungeRoomService {
  private readonly rooms = new Map<string, PokeLoungeRoomState>();

  constructor(
    @Optional() private roomCodeFactory: () => string = createRoomCode,
  ) {}

  createRoom(input: CreatePokeLoungeRoomInput): PokeLoungeRoomState {
    const nowMs = normalizeNow(input.nowMs);
    const roomCode = this.createUniqueRoomCode();
    const participant = createParticipant(input, 'participant', nowMs, 1);
    const room: PokeLoungeRoomState = {
      roomCode,
      status: 'waiting',
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      participants: [participant],
      partySnapshots: {},
      round: {
        index: 1,
        phase: 'waiting',
        durationMs: normalizeRoundDuration(input.roundDurationMs),
        startedAtMs: null,
        endsAtMs: null,
      },
      tournament: {
        matches: [],
        cumulativeScores: {},
      },
      finalStandings: [],
    };

    this.rooms.set(roomCode, room);

    return cloneRoom(room);
  }

  joinRoom(
    roomCode: string,
    input: JoinPokeLoungeRoomInput,
  ): PokeLoungeRoomState {
    const room = this.findRoom(roomCode);
    const nowMs = normalizeNow(input.nowMs);
    const existing = room.participants.find(
      (row) => row.playerId === input.playerId,
    );

    if (existing) {
      this.assertExistingParticipantRejoinable(room);
      existing.connected = true;
      existing.leftAtMs = undefined;
      existing.ready = existing.role === 'participant' ? existing.ready : false;
      room.updatedAtMs = nowMs;
      return cloneRoom(room);
    }

    this.assertRoomJoinable(room);

    const participantCount = room.participants.filter(
      (row) => row.role === 'participant',
    ).length;
    const role =
      participantCount < MAX_PARTICIPANTS ? 'participant' : 'spectator';
    room.participants.push(
      createParticipant(input, role, nowMs, room.participants.length + 1),
    );
    room.updatedAtMs = nowMs;

    return cloneRoom(room);
  }

  getRoom(roomCode: string, nowMs?: number): PokeLoungeRoomState {
    const room = this.findRoom(roomCode);
    this.advanceRoomClock(room, normalizeNow(nowMs));

    return cloneRoom(room);
  }

  setReady(
    roomCode: string,
    playerId: string,
    ready: boolean,
    nowMs?: number,
  ): PokeLoungeRoomState {
    const room = this.findRoom(roomCode);
    const participant = this.findParticipant(room, playerId);
    const currentMs = normalizeNow(nowMs);

    if (participant.role !== 'participant') {
      throw new BadRequestException('Spectators cannot become ready');
    }

    participant.ready = ready;
    room.updatedAtMs = currentMs;

    if (this.canStartRound(room)) {
      room.status = 'round-started';
      room.round.phase = 'round-started';
      room.round.startedAtMs = currentMs;
      room.round.endsAtMs = currentMs + room.round.durationMs;
    }

    return cloneRoom(room);
  }

  updatePartySnapshot(
    roomCode: string,
    input: UpdatePokeLoungePartySnapshotInput,
  ): PokeLoungeRoomState {
    const room = this.findRoom(roomCode);
    const participant = this.findParticipant(room, input.playerId);
    const currentMs = normalizeNow(input.nowMs);
    const requestSessionId = input.sessionId?.trim();

    if (!requestSessionId || participant.sessionId !== requestSessionId) {
      throw new BadRequestException(
        'Party snapshot sessionId does not match this participant',
      );
    }

    if (participant.role !== 'participant') {
      throw new BadRequestException(
        'Spectators cannot update tournament party snapshots',
      );
    }

    const representativePokemon = normalizeRepresentativePokemon(
      input.representativePokemon,
    );

    room.partySnapshots[participant.playerId] = {
      playerId: participant.playerId,
      ...(input.displayName?.trim()
        ? { displayName: input.displayName.trim() }
        : participant.displayName
          ? { displayName: participant.displayName }
          : {}),
      ...(representativePokemon ? { representativePokemon } : {}),
      updatedAtMs: currentMs,
    };
    room.updatedAtMs = currentMs;

    return cloneRoom(room);
  }

  submitMatchResult(
    roomCode: string,
    input: SubmitPokeLoungeMatchResultInput,
  ): PokeLoungeRoomState {
    const room = this.findRoom(roomCode);
    this.advanceRoomClock(room, normalizeNow(input.nowMs));

    if (room.status !== 'tournament') {
      throw new BadRequestException('Room is not accepting tournament results');
    }

    const match = this.findPendingMatch(room, input.matchId);
    this.assertValidMatchResult(match, input);
    this.completeMatch(
      room,
      match,
      input.winnerPlayerId,
      input.loserPlayerId,
      input.reason,
      input.nowMs,
    );

    return cloneRoom(room);
  }

  leaveRoom(
    roomCode: string,
    playerId: string,
    nowMs?: number,
  ): PokeLoungeRoomState {
    const room = this.findRoom(roomCode);
    const participant = this.findParticipant(room, playerId);
    const currentMs = normalizeNow(nowMs);

    participant.connected = false;
    participant.ready = false;
    participant.leftAtMs = currentMs;
    room.updatedAtMs = currentMs;

    if (room.status === 'waiting') {
      room.participants = room.participants.filter(
        (row) => row.playerId !== playerId,
      );
    }

    if (participant.role === 'participant') {
      this.completeParticipantLeaveAsForfeit(room, playerId, currentMs);
    }

    if (!room.participants.some((row) => row.connected)) {
      room.status = 'closed';
      room.round.phase = 'completed';
    }

    return cloneRoom(room);
  }

  resetForTest(roomCodeFactory: () => string = createRoomCode): void {
    this.rooms.clear();
    this.roomCodeFactory = roomCodeFactory;
  }

  private createUniqueRoomCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const roomCode = this.roomCodeFactory();
      if (!this.rooms.has(roomCode)) {
        return roomCode;
      }
    }

    throw new BadRequestException('Unable to create a unique room code');
  }

  private findRoom(roomCode: string): PokeLoungeRoomState {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedRoomCode);

    if (!room) {
      throw new NotFoundException('Poke Lounge room not found');
    }

    return room;
  }

  private findParticipant(
    room: PokeLoungeRoomState,
    playerId: string,
  ): PokeLoungeRoomParticipant {
    const participant = room.participants.find(
      (row) => row.playerId === playerId,
    );

    if (!participant) {
      throw new BadRequestException('Player is not in this room');
    }

    return participant;
  }

  private assertRoomJoinable(room: PokeLoungeRoomState): void {
    if (room.status !== 'waiting') {
      throw new BadRequestException('Room is not joinable');
    }
  }

  private assertExistingParticipantRejoinable(room: PokeLoungeRoomState): void {
    if (room.status !== 'waiting' && room.status !== 'round-started') {
      throw new BadRequestException('Room is not joinable');
    }
  }

  private canStartRound(room: PokeLoungeRoomState): boolean {
    if (room.status !== 'waiting' || room.round.phase !== 'waiting') {
      return false;
    }

    const participants = room.participants.filter(
      (row) => row.role === 'participant' && row.connected,
    );

    return (
      participants.length >= 2 &&
      participants.every((row) => row.ready && row.connected)
    );
  }

  private advanceRoomClock(room: PokeLoungeRoomState, nowMs: number): void {
    if (
      room.status !== 'round-started' ||
      room.round.phase !== 'round-started' ||
      room.round.endsAtMs === null ||
      nowMs < room.round.endsAtMs
    ) {
      return;
    }

    room.status = 'tournament';
    room.round.phase = 'tournament';
    room.updatedAtMs = nowMs;
    room.tournament.matches = createTournamentMatches(room);
  }

  private findPendingMatch(
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

  private assertValidMatchResult(
    match: PokeLoungeTournamentMatch,
    input: SubmitPokeLoungeMatchResultInput,
  ): void {
    const participantIds = new Set(match.participantIds);

    if (!participantIds.has(input.reportingPlayerId)) {
      throw new BadRequestException(
        'Reporting player is not assigned to this match',
      );
    }

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

  private completeMatch(
    room: PokeLoungeRoomState,
    match: PokeLoungeTournamentMatch,
    winnerPlayerId: string,
    loserPlayerId: string,
    reason: PokeLoungeMatchResultReason,
    nowMs?: number,
  ): void {
    const currentMs = normalizeNow(nowMs);
    match.status = 'completed';
    match.winnerPlayerId = winnerPlayerId;
    match.loserPlayerId = loserPlayerId;
    match.resultReason = reason;
    match.completedAtMs = currentMs;
    room.tournament.cumulativeScores[winnerPlayerId] =
      (room.tournament.cumulativeScores[winnerPlayerId] ?? 0) + WIN_SCORE;
    room.tournament.cumulativeScores[loserPlayerId] =
      (room.tournament.cumulativeScores[loserPlayerId] ?? 0) + LOSS_SCORE;
    room.updatedAtMs = currentMs;

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

  private completeParticipantLeaveAsForfeit(
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
        this.completeMatch(room, match, opponentId, playerId, 'forfeit', nowMs);
      }

      return;
    }

    if (room.status !== 'round-started') {
      return;
    }

    const opponents = room.participants.filter(
      (row) =>
        row.role === 'participant' &&
        row.connected &&
        row.playerId !== playerId,
    );

    if (opponents.length !== 1) {
      return;
    }

    const [opponent] = opponents;

    const participantIds = createParticipantIdsForForfeit(room, [
      playerId,
      opponent.playerId,
    ]);
    const match: PokeLoungeTournamentMatch = {
      matchId: `round-${room.round.index}-match-${room.tournament.matches.length + 1}`,
      participantIds,
      status: 'pending',
    };

    room.status = 'tournament';
    room.round.phase = 'tournament';
    room.tournament.matches.push(match);
    this.completeMatch(
      room,
      match,
      opponent.playerId,
      playerId,
      'forfeit',
      nowMs,
    );
  }
}

function createParticipant(
  input: CreatePokeLoungeRoomInput | JoinPokeLoungeRoomInput,
  role: PokeLoungeRoomParticipant['role'],
  nowMs: number,
  index: number,
): PokeLoungeRoomParticipant {
  const playerId = input.playerId?.trim() || `player-${index}`;
  const sessionId = input.sessionId?.trim() || `session-${index}`;

  return {
    sessionId,
    playerId,
    ...(input.userId?.trim() ? { userId: input.userId.trim() } : {}),
    displayName: input.displayName?.trim() || formatDefaultPlayerName(playerId),
    role,
    ready: false,
    connected: true,
    joinedAtMs: nowMs,
  };
}

function createTournamentMatches(
  room: PokeLoungeRoomState,
): PokeLoungeTournamentMatch[] {
  const participants = room.participants
    .filter((row) => row.role === 'participant' && row.connected)
    .sort(
      (left, right) =>
        left.joinedAtMs - right.joinedAtMs ||
        left.playerId.localeCompare(right.playerId),
    );
  const matches: PokeLoungeTournamentMatch[] = [];

  for (let index = 0; index + 1 < participants.length; index += 2) {
    matches.push({
      matchId: `round-${room.round.index}-match-${matches.length + 1}`,
      participantIds: [
        participants[index].playerId,
        participants[index + 1].playerId,
      ],
      status: 'pending',
    });
  }

  return matches;
}

function createParticipantIdsForForfeit(
  room: PokeLoungeRoomState,
  playerIds: [string, string],
): [string, string] {
  const playerIdSet = new Set(playerIds);
  const orderedIds = room.participants
    .filter((row) => playerIdSet.has(row.playerId))
    .sort(
      (left, right) =>
        left.joinedAtMs - right.joinedAtMs ||
        left.playerId.localeCompare(right.playerId),
    )
    .map((row) => row.playerId);

  return orderedIds.length === 2 ? [orderedIds[0], orderedIds[1]] : playerIds;
}

function createFinalStandings(
  room: PokeLoungeRoomState,
): PokeLoungeFinalStanding[] {
  return room.participants
    .filter((row) => row.role === 'participant')
    .map((row) => ({
      playerId: row.playerId,
      displayName: row.displayName,
      score: room.tournament.cumulativeScores[row.playerId] ?? 0,
      rank: 0,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.playerId.localeCompare(right.playerId),
    )
    .map((row, index, rows) => ({
      ...row,
      rank:
        index > 0 && rows[index - 1].score === row.score
          ? rows[index - 1].rank
          : index + 1,
    }));
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

function normalizeNow(nowMs: number | undefined): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : Date.now();
}

function formatDefaultPlayerName(playerId: string): string {
  const match = /^player-(\d+)$/.exec(playerId);

  return match ? `Player ${match[1]}` : playerId;
}

function cloneRoom(room: PokeLoungeRoomState): PokeLoungeRoomState {
  return structuredClone(room);
}

function normalizeRepresentativePokemon(
  value: PokeLoungePartySnapshot['representativePokemon'] | undefined,
): PokeLoungePartySnapshot['representativePokemon'] | undefined {
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

function createRoomCode(): string {
  return Array.from({ length: 6 }, () => {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);

    return ROOM_CODE_ALPHABET[index];
  }).join('');
}
