import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';
import {
  POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS,
  advancePokeLoungeRoomClock,
  getPokeLoungeRoomExpiresAtMs,
  isPokeLoungeRoomExpired,
} from './poke-lounge-room-policy';

const MINUTE_MS = 60_000;

describe('PokeLoungeRoomPolicy', () => {
  it.each([
    ['waiting', 30 * MINUTE_MS],
    ['completed', 10 * MINUTE_MS],
    ['closed', 10 * MINUTE_MS],
  ] as const)(
    'expires %s rooms from their latest update',
    (status, retentionMs) => {
      const room = createSnapshot({ status, updatedAtMs: 1_000 });

      expect(getPokeLoungeRoomExpiresAtMs(room)).toBe(1_000 + retentionMs);
    },
  );

  it.each(['round-started', 'tournament'] as const)(
    'keeps active %s rooms on a finite non-null expiry sentinel',
    (status) => {
      expect(getPokeLoungeRoomExpiresAtMs(createSnapshot({ status }))).toBe(
        POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS,
      );
    },
  );

  it('uses a strict expiry boundary', () => {
    const room = createSnapshot({
      status: 'waiting',
      updatedAtMs: 1_000,
    });
    const expiresAtMs = getPokeLoungeRoomExpiresAtMs(room);

    expect(isPokeLoungeRoomExpired({ ...room, expiresAtMs }, expiresAtMs)).toBe(
      false,
    );
    expect(
      isPokeLoungeRoomExpired({ ...room, expiresAtMs }, expiresAtMs + 1),
    ).toBe(true);
  });

  it('advances an elapsed round once with deterministic tournament matches', () => {
    const room = createSnapshot({
      status: 'round-started',
      revision: 7,
      participants: [
        createParticipant('player-c', 30),
        createParticipant('player-a', 10),
        createParticipant('player-b', 20),
      ],
      round: {
        index: 2,
        phase: 'round-started',
        durationMs: 1_000,
        startedAtMs: 100,
        endsAtMs: 1_100,
      },
    });

    const advanced = advancePokeLoungeRoomClock(room, 1_100);

    expect(advanced).toMatchObject({
      status: 'tournament',
      revision: 8,
      updatedAtMs: 1_100,
      expiresAtMs: POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS,
      round: { phase: 'tournament' },
      tournament: {
        matches: [
          {
            matchId: 'round-2-match-1',
            participantIds: ['player-a', 'player-b'],
            status: 'pending',
          },
        ],
      },
    });
    expect(room).toMatchObject({
      status: 'round-started',
      revision: 7,
      tournament: { matches: [] },
    });
  });

  it('does not advance before the round deadline or after advancement', () => {
    const running = createSnapshot({
      status: 'round-started',
      round: {
        index: 1,
        phase: 'round-started',
        durationMs: 1_000,
        startedAtMs: 100,
        endsAtMs: 1_100,
      },
    });

    expect(advancePokeLoungeRoomClock(running, 1_099)).toBeNull();
    expect(
      advancePokeLoungeRoomClock(
        createSnapshot({ status: 'tournament' }),
        1_100,
      ),
    ).toBeNull();
  });
});

function createSnapshot(
  overrides: Partial<PokeLoungeRoomSnapshot> = {},
): PokeLoungeRoomSnapshot {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    participants: [],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting',
      durationMs: 1_000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: {
      matches: [],
      cumulativeScores: {},
    },
    finalStandings: [],
    revision: 0,
    expiresAtMs: 1_000 + 30 * MINUTE_MS,
    ...overrides,
  };
}

function createParticipant(playerId: string, joinedAtMs: number) {
  return {
    sessionId: `session-${playerId}`,
    playerId,
    displayName: playerId,
    role: 'participant' as const,
    ready: true,
    connected: true,
    joinedAtMs,
  };
}
