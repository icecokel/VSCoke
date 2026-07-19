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
const HOUR_MS = 60 * MINUTE_MS;

export const POKE_LOUNGE_ROOM_CAPACITY = 200;
export const POKE_LOUNGE_CREATION_ADVISORY_LOCK = 742198451;
export const POKE_LOUNGE_ACTIVE_ROOM_LEASE_MS = 2 * HOUR_MS;
export const POKE_LOUNGE_PENDING_PRESENCE_LEASE_MS = 15_000;
const MAX_TOURNAMENT_WALKOVERS = 12;

export function getPokeLoungeRoomExpiresAtMs(
  room: Pick<PokeLoungeRoomState, 'status' | 'updatedAtMs'> &
    Partial<Pick<PokeLoungeRoomState, 'participants'>>,
): number {
  switch (room.status) {
    case 'waiting': {
      const waitingExpiryMs = room.updatedAtMs + 30 * MINUTE_MS;
      if (
        !room.participants ||
        room.participants.some(
          (participant) =>
            participant.connected &&
            participant.presencePendingUntilMs === undefined,
        )
      ) {
        return waitingExpiryMs;
      }

      const pendingExpiries = room.participants.flatMap((participant) =>
        participant.presencePendingUntilMs === undefined
          ? []
          : [participant.presencePendingUntilMs],
      );
      return pendingExpiries.length > 0
        ? Math.min(waitingExpiryMs, ...pendingExpiries)
        : waitingExpiryMs;
    }
    case 'round-started':
    case 'tournament':
      return room.updatedAtMs + POKE_LOUNGE_ACTIVE_ROOM_LEASE_MS;
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

export function expirePendingPokeLoungePresence(
  room: PokeLoungeRoomSnapshot,
  nowMs: number,
): PokeLoungeRoomSnapshot | null {
  const expiredPlayerIds = new Set(
    room.participants
      .filter(
        (participant) =>
          participant.presencePendingUntilMs !== undefined &&
          participant.presencePendingUntilMs <= nowMs,
      )
      .map((participant) => participant.playerId),
  );
  if (expiredPlayerIds.size === 0) {
    return null;
  }

  const expired = structuredClone(room);
  if (expired.status === 'waiting' || expired.status === 'round-started') {
    expired.participants = expired.participants.filter(
      (participant) => !expiredPlayerIds.has(participant.playerId),
    );
    for (const playerId of expiredPlayerIds) {
      delete expired.partySnapshots[playerId];
    }
  } else {
    for (const participant of expired.participants) {
      if (expiredPlayerIds.has(participant.playerId)) {
        participant.connected = false;
        participant.ready = false;
        participant.leftAtMs = nowMs;
        delete participant.presencePendingUntilMs;
      }
    }
    if (
      expired.status === 'tournament' &&
      expired.tournament.activeMatchAuthority !== 'server'
    ) {
      convergeOfflinePokeLoungeTournamentMatches(expired, nowMs);
    }
  }

  expired.updatedAtMs = nowMs;
  expired.revision = room.revision + 1;
  if (
    (expired.status === 'waiting' || expired.status === 'round-started') &&
    !expired.participants.some(
      (participant) =>
        participant.connected &&
        participant.presencePendingUntilMs === undefined,
    )
  ) {
    expired.status = 'closed';
    expired.round.phase = 'completed';
  }
  expired.expiresAtMs = getPokeLoungeRoomExpiresAtMs(expired);
  return expired;
}

export function createTournamentState(
  room: PokeLoungeRoomState,
): PokeLoungeRoomState['tournament'] {
  const participants = room.participants
    .filter((participant) => {
      return (
        participant.role === 'participant' &&
        participant.connected &&
        participant.presencePendingUntilMs === undefined
      );
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

export type PokeLoungeOfflineForfeit = {
  matchId: string;
  winnerPlayerId: string;
  loserPlayerId: string;
};

export function convergeOfflinePokeLoungeTournamentMatches(
  room: PokeLoungeRoomState,
  nowMs: number,
): PokeLoungeOfflineForfeit[] {
  const completed: PokeLoungeOfflineForfeit[] = [];

  for (let attempt = 0; attempt < MAX_TOURNAMENT_WALKOVERS; attempt += 1) {
    if (room.status !== 'tournament' || !room.tournament.activeMatchId) {
      return completed;
    }
    const match = room.tournament.bracket?.currentRound?.matches.find(
      (candidate) =>
        candidate.matchId === room.tournament.activeMatchId &&
        candidate.status === 'ready',
    );
    if (!match) {
      return completed;
    }

    const [participantA, participantB] = match.participantIds.map((playerId) =>
      room.participants.find(
        (participant) => participant.playerId === playerId,
      ),
    );
    if (
      isParticipantPresenceActive(participantA) &&
      isParticipantPresenceActive(participantB)
    ) {
      return completed;
    }

    const winnerPlayerId = selectWalkoverWinner(
      match.participantIds,
      participantA,
      participantB,
    );
    const loserPlayerId = match.participantIds.find(
      (playerId) => playerId !== winnerPlayerId,
    );
    if (!loserPlayerId) {
      return completed;
    }
    completePokeLoungeTournamentMatch(
      room,
      match.matchId,
      winnerPlayerId,
      'forfeit',
      nowMs,
    );
    completed.push({
      matchId: match.matchId,
      winnerPlayerId,
      loserPlayerId,
    });
  }

  throw new Error('Tournament offline-forfeit convergence exceeded its bound');
}

function selectWalkoverWinner(
  participantIds: readonly [string, string],
  participantA: PokeLoungeRoomState['participants'][number] | undefined,
  participantB: PokeLoungeRoomState['participants'][number] | undefined,
): string {
  if (isParticipantPresenceActive(participantA)) {
    return participantIds[0];
  }
  if (isParticipantPresenceActive(participantB)) {
    return participantIds[1];
  }

  const leftAtA = participantA?.leftAtMs ?? Number.NEGATIVE_INFINITY;
  const leftAtB = participantB?.leftAtMs ?? Number.NEGATIVE_INFINITY;
  if (leftAtA !== leftAtB) {
    return leftAtA > leftAtB ? participantIds[0] : participantIds[1];
  }
  return [...participantIds].sort((left, right) =>
    left.localeCompare(right),
  )[0];
}

function isParticipantPresenceActive(
  participant: PokeLoungeRoomState['participants'][number] | undefined,
): boolean {
  return (
    participant === undefined ||
    (participant.connected && participant.presencePendingUntilMs === undefined)
  );
}
