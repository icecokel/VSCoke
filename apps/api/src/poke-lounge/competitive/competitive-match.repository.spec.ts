import type { PokeLoungeRoomState } from '../poke-lounge-room.types';
import { planCompetitiveSeatBinding } from './competitive-match.repository';

describe('planCompetitiveSeatBinding', () => {
  it('rejects forged, anonymous, inactive, overwrite, and duplicate-account binding', () => {
    const room = roomState();

    expect(plan(room, [], 'forged', 'account-a')).toEqual({
      outcome: 'seat-not-found',
    });
    expect(
      plan(
        {
          ...room,
          participants: [{ ...room.participants[0], connected: false }],
        },
        [],
        'session-a',
        'account-a',
      ),
    ).toEqual({ outcome: 'inactive-seat' });
    expect(
      plan(
        room,
        [seat('session-a', 'player-a', 'account-other')],
        'session-a',
        'account-a',
      ),
    ).toEqual({ outcome: 'seat-account-conflict' });
    expect(
      plan(
        room,
        [seat('session-b', 'player-b', 'account-a')],
        'session-a',
        'account-a',
      ),
    ).toEqual({ outcome: 'duplicate-account' });
  });

  it('is idempotent for the same account and creates one assignment at exactly two bound seats', () => {
    const room = roomState();
    const first = plan(room, [], 'session-a', 'account-a');

    expect(first).toMatchObject({ outcome: 'bind', assignmentPlayers: null });

    const second = plan(
      room,
      [seat('session-a', 'player-a', 'account-a')],
      'session-b',
      'account-b',
    );
    expect(second).toEqual({
      outcome: 'bind',
      seat: seat('session-b', 'player-b', 'account-b'),
      assignmentPlayers: [
        { playerId: 'player-a', accountId: 'account-a' },
        { playerId: 'player-b', accountId: 'account-b' },
      ],
    });

    const replay = plan(
      room,
      [
        seat('session-a', 'player-a', 'account-a'),
        seat('session-b', 'player-b', 'account-b'),
      ],
      'session-a',
      'account-a',
    );
    expect(replay.outcome).toBe('already-bound');
    expect(
      'assignmentPlayers' in replay && Array.isArray(replay.assignmentPlayers),
    ).toBe(true);
  });

  it('keeps rooms with more than two active participants casual', () => {
    const room = roomState();
    room.participants.push({
      sessionId: 'session-c',
      playerId: 'player-c',
      displayName: 'C',
      role: 'participant',
      ready: false,
      connected: true,
      joinedAtMs: 2,
    });

    expect(
      plan(
        room,
        [seat('session-a', 'player-a', 'account-a')],
        'session-b',
        'account-b',
      ),
    ).toMatchObject({ outcome: 'bind', assignmentPlayers: null });
  });
});

function plan(
  room: PokeLoungeRoomState,
  seats: ReturnType<typeof seat>[],
  sessionId: string,
  accountId: string,
) {
  return planCompetitiveSeatBinding({ room, seats, sessionId, accountId });
}

function seat(sessionId: string, playerId: string, accountId: string) {
  return { sessionId, playerId, accountId };
}

function roomState(): PokeLoungeRoomState {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      {
        sessionId: 'session-a',
        playerId: 'player-a',
        displayName: 'A',
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: 0,
      },
      {
        sessionId: 'session-b',
        playerId: 'player-b',
        displayName: 'B',
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: 1,
      },
    ],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting',
      durationMs: 1000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: { matches: [], cumulativeScores: {} },
    finalStandings: [],
  };
}
