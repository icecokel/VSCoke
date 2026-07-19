import type { PokeLoungeRoomCommittedEvent } from './poke-lounge-room-event.publisher';
import { PokeLoungeRoomEventsService } from './poke-lounge-room-events.service';
import type { PokeLoungePublicRoomState } from './poke-lounge-room.types';

describe('PokeLoungeRoomEventsService', () => {
  it('maps a committed Task 5 event to a cloned public room snapshot', async () => {
    const service = new PokeLoungeRoomEventsService();
    const listener = jest.fn();
    const room = publicRoom();
    service.subscribe(listener);

    await service.publish(committedEvent(room));
    room.participants[0].displayName = 'mutated after publish';

    expect(listener).toHaveBeenCalledWith({
      type: 'room.snapshot',
      room: publicRoom(),
    });
    expect(JSON.stringify(listener.mock.calls)).not.toContain('sessionId');
  });

  it('stops delivering events after unsubscribe', async () => {
    const service = new PokeLoungeRoomEventsService();
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    unsubscribe();

    await service.publish(committedEvent(publicRoom()));

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers only the sanitized competitive projection through the room socket path', async () => {
    const service = new PokeLoungeRoomEventsService();
    const listener = jest.fn();
    const room = publicRoom();
    room.competitive = {
      matchId: 'match-1',
      assignmentRevision: 1,
      rulesetVersion: 1,
      rulesetHash: 'b'.repeat(64),
      currentTurn: 1,
      status: 'active',
      playerIds: ['player-a', 'player-b'],
      currentState: {
        rulesetVersion: 1,
        turn: 1,
        participantIds: ['player-a', 'player-b'],
        playersById: {},
        terminal: null,
      },
      stateHash: 'a'.repeat(64),
      submittedPlayerIds: [],
      terminal: null,
    };
    service.subscribe(listener);

    await service.publish({
      type: 'competitive-action-committed',
      snapshot: room,
    });

    const serialized = JSON.stringify(listener.mock.calls);
    expect(serialized).toContain('match-1');
    expect(serialized).not.toContain('accountId');
    expect(serialized).not.toContain('sessionId');
    expect(serialized).not.toContain('serverSeed');
    expect(serialized).not.toContain('clientCommandId');
  });
});

function committedEvent(
  snapshot: PokeLoungePublicRoomState,
): PokeLoungeRoomCommittedEvent {
  return { type: 'room-updated', snapshot };
}

function publicRoom(): PokeLoungePublicRoomState {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      {
        playerId: 'player-1',
        displayName: 'Player 1',
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: 0,
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
    tournament: emptyTournament(),
    finalStandings: [],
    revision: 3,
    expiresAtMs: 30 * 60_000,
  };
}

function emptyTournament() {
  return {
    version: 2 as const,
    bracket: null,
    activeMatchId: null,
    activeMatchAuthority: null,
    cumulativeScores: {},
  };
}
