import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';
import type {
  PokeLoungeRoomState,
  PokeLoungeTournamentMatch,
} from './poke-lounge-room.types';

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
  advanced.tournament.matches = createTournamentMatches(advanced);
  advanced.expiresAtMs = getPokeLoungeRoomExpiresAtMs(advanced);

  return advanced;
}

function createTournamentMatches(
  room: PokeLoungeRoomState,
): PokeLoungeTournamentMatch[] {
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
