import {
  accumulateTournamentScores,
  createTournamentBracketState,
  getReadyTournamentMatches,
  getTournamentStandings,
  rankCumulativeTournamentScores,
  recordTournamentMatchResult,
  scoreTournamentStandings,
} from '@vscoke/poke-lounge-battle';
import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';
import type { PokeLoungeRoomState } from './poke-lounge-room.types';
import type { PokeLoungeMatchResultReason } from './poke-lounge-room.types';

const MINUTE_MS = 60_000;

export const POKE_LOUNGE_ROOM_CAPACITY = 200;
export const POKE_LOUNGE_CREATION_ADVISORY_LOCK = 742198451;
export const POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS = Date.UTC(
  9999,
  11,
  31,
  23,
  59,
  59,
  999,
);

export function getPokeLoungeRoomExpiresAtMs(
  room: Pick<PokeLoungeRoomState, 'status' | 'updatedAtMs'>,
): number {
  switch (room.status) {
    case 'waiting':
      return room.updatedAtMs + 30 * MINUTE_MS;
    case 'round-started':
    case 'tournament':
      return POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS;
    case 'completed':
    case 'closed':
      return room.updatedAtMs + 10 * MINUTE_MS;
  }
}

export function isPokeLoungeRoomExpired(
  room: Pick<PokeLoungeRoomSnapshot, 'expiresAtMs'>,
  nowMs: number,
): boolean {
  return room.expiresAtMs < nowMs;
}

export function advancePokeLoungeRoomClock(
  room: PokeLoungeRoomSnapshot,
  nowMs: number,
): PokeLoungeRoomSnapshot | null {
  if (
    room.status !== 'round-started' ||
    room.round.phase !== 'round-started' ||
    room.round.endsAtMs === null ||
    nowMs < room.round.endsAtMs
  ) {
    return null;
  }

  const advanced = structuredClone(room);
  advanced.status = 'tournament';
  advanced.round.phase = 'tournament';
  advanced.updatedAtMs = nowMs;
  advanced.revision = room.revision + 1;
  advanced.tournament = createTournamentState(advanced);
  advanced.expiresAtMs = getPokeLoungeRoomExpiresAtMs(advanced);

  return advanced;
}

export function createTournamentState(
  room: PokeLoungeRoomState,
): PokeLoungeRoomState['tournament'] {
  const participants = room.participants
    .filter((participant) => {
      return participant.role === 'participant' && participant.connected;
    })
    .sort((left, right) => {
      return (
        left.joinedAtMs - right.joinedAtMs ||
        left.playerId.localeCompare(right.playerId)
      );
    });
  const bracket = createTournamentBracketState(
    participants.map(({ playerId, displayName }) => ({
      playerId,
      displayName,
    })),
    room.round.index,
  );

  return {
    version: 2,
    bracket,
    activeMatchId: getReadyTournamentMatches(bracket)[0]?.matchId ?? null,
    activeMatchAuthority: 'casual',
    cumulativeScores: structuredClone(room.tournament.cumulativeScores),
  };
}

export function normalizeLegacyPokeLoungeRoomSnapshot(
  room: PokeLoungeRoomSnapshot,
  nowMs: number,
): PokeLoungeRoomSnapshot | null {
  const tournament = room.tournament as unknown as {
    version?: number;
    matches?: Array<{ status?: string }>;
    cumulativeScores?: Record<string, number>;
  };
  if (tournament.version === 2) {
    return null;
  }

  const normalized = structuredClone(room);
  normalized.tournament = {
    version: 2,
    bracket: null,
    activeMatchId: null,
    activeMatchAuthority: null,
    cumulativeScores: structuredClone(tournament.cumulativeScores ?? {}),
  };
  normalized.revision = room.revision + 1;
  normalized.updatedAtMs = nowMs;

  const canRestartDeterministically =
    (room.status === 'waiting' || room.status === 'round-started') &&
    !(tournament.matches ?? []).some((match) => match.status === 'completed');

  if (!canRestartDeterministically) {
    normalized.status = 'closed';
    normalized.closeReason = 'legacy-room-restart-required';
    normalized.round.phase = 'completed';
    normalized.round.endsAtMs = null;
  }

  normalized.expiresAtMs = getPokeLoungeRoomExpiresAtMs(normalized);
  return normalized;
}

export function completePokeLoungeTournamentMatch(
  room: PokeLoungeRoomState,
  matchId: string,
  winnerPlayerId: string,
  reason: PokeLoungeMatchResultReason,
  nowMs: number,
): void {
  const bracket = room.tournament.bracket;
  if (!bracket) {
    throw new Error('Tournament bracket is not initialized');
  }

  room.tournament.bracket = recordTournamentMatchResult(
    bracket,
    matchId,
    winnerPlayerId,
    { reason, completedAtMs: nowMs },
  );
  room.updatedAtMs = nowMs;

  if (room.tournament.bracket.status === 'completed') {
    const roundScores = scoreTournamentStandings(
      getTournamentStandings(room.tournament.bracket),
    );
    room.tournament.cumulativeScores = accumulateTournamentScores(
      room.tournament.cumulativeScores,
      roundScores,
    );
    room.tournament.activeMatchId = null;
    room.tournament.activeMatchAuthority = null;
    room.status = 'completed';
    room.round.phase = 'completed';
    room.finalStandings = rankCumulativeTournamentScores(
      room.tournament.cumulativeScores,
      room.tournament.bracket.participants,
    ).map(({ playerId, displayName, score, rank }) => ({
      playerId,
      displayName,
      score,
      rank,
    }));
    return;
  }

  room.tournament.activeMatchId =
    getReadyTournamentMatches(room.tournament.bracket)[0]?.matchId ?? null;
  room.tournament.activeMatchAuthority = room.tournament.activeMatchId
    ? 'casual'
    : null;
}
