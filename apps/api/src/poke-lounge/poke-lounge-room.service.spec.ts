import { BadRequestException } from '@nestjs/common';
import { PokeLoungeRoomService } from './poke-lounge-room.service';

describe('PokeLoungeRoomService', () => {
  let service: PokeLoungeRoomService;

  beforeEach(() => {
    service = new PokeLoungeRoomService(() => 'ROOM01');
  });

  it('creates a room with a participant identity separated from session id', () => {
    const room = service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      userId: 'user-a',
      displayName: 'Player A',
      roundDurationMs: 1000,
      nowMs: 100,
    });

    expect(room.roomCode).toBe('ROOM01');
    expect(room.status).toBe('waiting');
    expect(room.participants).toEqual([
      expect.objectContaining({
        playerId: 'player-a',
        sessionId: 'session-a',
        userId: 'user-a',
        role: 'participant',
        ready: false,
        connected: true,
      }),
    ]);
  });

  it('keeps the seventh joiner as spectator when participant slots are full', () => {
    service.createRoom({ playerId: 'player-1', sessionId: 'session-1' });

    for (let index = 2; index <= 7; index += 1) {
      service.joinRoom('ROOM01', {
        playerId: `player-${index}`,
        sessionId: `session-${index}`,
      });
    }

    const room = service.getRoom('ROOM01');
    const participants = room.participants.filter(
      (row) => row.role === 'participant',
    );
    const spectators = room.participants.filter(
      (row) => row.role === 'spectator',
    );

    expect(participants).toHaveLength(6);
    expect(spectators).toEqual([
      expect.objectContaining({
        playerId: 'player-7',
        sessionId: 'session-7',
        ready: false,
      }),
    ]);
  });

  it('does not start the server round until every participant is ready', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1000,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });

    const waiting = service.setReady(
      'ROOM01',
      'player-a',
      'session-a',
      true,
      100,
    );

    expect(waiting.status).toBe('waiting');
    expect(waiting.round.phase).toBe('waiting');

    const started = service.setReady(
      'ROOM01',
      'player-b',
      'session-b',
      true,
      200,
    );

    expect(started.status).toBe('round-started');
    expect(started.round).toEqual(
      expect.objectContaining({
        phase: 'round-started',
        startedAtMs: 200,
        endsAtMs: 1200,
      }),
    );
  });

  it('rejects new participants after the server round has started', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1000,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });
    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);

    expect(() =>
      service.joinRoom('ROOM01', {
        playerId: 'player-c',
        sessionId: 'session-c',
        nowMs: 100,
      }),
    ).toThrow(BadRequestException);

    const room = service.getRoom('ROOM01', 1000);

    expect(room.tournament.matches).toEqual([
      expect.objectContaining({
        matchId: 'round-1-match-1',
        participantIds: ['player-a', 'player-b'],
      }),
    ]);
  });

  it('stores a participant party snapshot and exposes it from room state', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      displayName: 'Player A',
      nowMs: 0,
    });

    const room = service.updatePartySnapshot('ROOM01', {
      playerId: 'player-a',
      sessionId: 'session-a',
      displayName: 'Alpha',
      representativePokemon: {
        speciesId: 25,
        name: 'Pikachu',
        level: 12,
        currentHp: 18,
        maxHp: 30,
      },
      nowMs: 50,
    });

    expect(room.partySnapshots['player-a']).toEqual({
      playerId: 'player-a',
      displayName: 'Alpha',
      representativePokemon: {
        speciesId: 25,
        name: 'Pikachu',
        level: 12,
        currentHp: 18,
        maxHp: 30,
      },
      updatedAtMs: 50,
    });
  });

  it('rejects spectator and missing participants when updating party snapshots', () => {
    service.createRoom({
      playerId: 'player-1',
      sessionId: 'session-1',
      nowMs: 0,
    });

    for (let index = 2; index <= 7; index += 1) {
      service.joinRoom('ROOM01', {
        playerId: `player-${index}`,
        sessionId: `session-${index}`,
        nowMs: index,
      });
    }

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-7',
        sessionId: 'session-7',
        representativePokemon: {
          speciesId: 1,
          name: 'Bulbasaur',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'missing-player',
        sessionId: 'missing-session',
        representativePokemon: {
          speciesId: 4,
          name: 'Charmander',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing or mismatched session ids when updating party snapshots', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
      nowMs: 1,
    });

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-a',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-a',
        sessionId: 'session-b',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing or mismatched session ids for participant writes', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });

    expect(() =>
      service.setReady('ROOM01', 'player-a', undefined, true, 0),
    ).toThrow(BadRequestException);
    expect(() =>
      service.setReady('ROOM01', 'player-a', 'session-b', true, 0),
    ).toThrow(BadRequestException);

    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);
    service.getRoom('ROOM01', 1);

    expect(() =>
      service.submitMatchResult('ROOM01', {
        reportingPlayerId: 'player-a',
        reportingSessionId: 'session-b',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.leaveRoom('ROOM01', 'player-a', 'session-b', 2),
    ).toThrow(BadRequestException);
  });

  it('rejects malformed representative pokemon values', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      nowMs: 0,
    });

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 0,
          name: 'Pikachu',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 0,
          currentHp: 20,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 5,
          currentHp: 20,
          maxHp: -1,
        },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.updatePartySnapshot('ROOM01', {
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 5,
          currentHp: 21,
          maxHp: 20,
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('releases a waiting participant slot when that participant leaves', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });

    const afterLeave = service.leaveRoom('ROOM01', 'player-b', 'session-b', 10);

    expect(afterLeave.status).toBe('waiting');
    expect(
      afterLeave.participants.map((participant) => participant.playerId),
    ).toEqual(['player-a']);

    const afterReplacement = service.joinRoom('ROOM01', {
      playerId: 'player-c',
      sessionId: 'session-c',
      nowMs: 20,
    });

    expect(afterReplacement.participants).toEqual([
      expect.objectContaining({ playerId: 'player-a', role: 'participant' }),
      expect.objectContaining({ playerId: 'player-c', role: 'participant' }),
    ]);

    service.setReady('ROOM01', 'player-a', 'session-a', true, 30);
    const started = service.setReady(
      'ROOM01',
      'player-c',
      'session-c',
      true,
      40,
    );

    expect(started.status).toBe('round-started');
    expect(started.round.phase).toBe('round-started');
  });

  it('server timer advances to tournament and assigns matches', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1000,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });
    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);

    const room = service.getRoom('ROOM01', 1000);

    expect(room.status).toBe('tournament');
    expect(room.round.phase).toBe('tournament');
    expect(room.tournament.matches).toEqual([
      expect.objectContaining({
        matchId: 'round-1-match-1',
        participantIds: ['player-a', 'player-b'],
        status: 'pending',
      }),
    ]);
  });

  it('rejects non-participant and duplicate match results', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });
    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);
    service.getRoom('ROOM01', 1);

    expect(() =>
      service.submitMatchResult('ROOM01', {
        reportingPlayerId: 'player-c',
        reportingSessionId: 'session-c',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      }),
    ).toThrow(BadRequestException);

    const completed = service.submitMatchResult('ROOM01', {
      reportingPlayerId: 'player-a',
      reportingSessionId: 'session-a',
      matchId: 'round-1-match-1',
      winnerPlayerId: 'player-a',
      loserPlayerId: 'player-b',
      reason: 'faint',
    });

    expect(completed.status).toBe('completed');
    expect(completed.finalStandings).toEqual([
      expect.objectContaining({ playerId: 'player-a', rank: 1, score: 100 }),
      expect.objectContaining({ playerId: 'player-b', rank: 2, score: 50 }),
    ]);

    expect(() =>
      service.submitMatchResult('ROOM01', {
        reportingPlayerId: 'player-b',
        reportingSessionId: 'session-b',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-b',
        loserPlayerId: 'player-a',
        reason: 'faint',
      }),
    ).toThrow(BadRequestException);
  });

  it('records a participant leave as a server forfeit result during tournament', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });
    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);
    service.getRoom('ROOM01', 1);

    const room = service.leaveRoom('ROOM01', 'player-a', 'session-a');

    expect(room.participants).toContainEqual(
      expect.objectContaining({
        playerId: 'player-a',
        connected: false,
      }),
    );
    expect(room.status).toBe('completed');
    expect(room.tournament.matches[0]).toEqual(
      expect.objectContaining({
        winnerPlayerId: 'player-b',
        loserPlayerId: 'player-a',
        resultReason: 'forfeit',
      }),
    );
    expect(room.finalStandings).toEqual([
      expect.objectContaining({ playerId: 'player-b', rank: 1, score: 100 }),
      expect.objectContaining({ playerId: 'player-a', rank: 2, score: 50 }),
    ]);
  });

  it('records a round-started participant leave as a server forfeit result', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1000,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });
    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);

    const room = service.leaveRoom('ROOM01', 'player-a', 'session-a', 100);

    expect(room.status).toBe('completed');
    expect(room.round.phase).toBe('completed');
    expect(room.tournament.matches).toEqual([
      expect.objectContaining({
        participantIds: ['player-a', 'player-b'],
        winnerPlayerId: 'player-b',
        loserPlayerId: 'player-a',
        resultReason: 'forfeit',
      }),
    ]);
    expect(room.finalStandings).toEqual([
      expect.objectContaining({ playerId: 'player-b', rank: 1, score: 100 }),
      expect.objectContaining({ playerId: 'player-a', rank: 2, score: 50 }),
    ]);

    const afterTimer = service.getRoom('ROOM01', 1000);

    expect(afterTimer.status).toBe('completed');
    expect(afterTimer.finalStandings).toHaveLength(2);
  });

  it('rejects match results with an invalid reason', () => {
    service.createRoom({
      playerId: 'player-a',
      sessionId: 'session-a',
      roundDurationMs: 1,
      nowMs: 0,
    });
    service.joinRoom('ROOM01', {
      playerId: 'player-b',
      sessionId: 'session-b',
    });
    service.setReady('ROOM01', 'player-a', 'session-a', true, 0);
    service.setReady('ROOM01', 'player-b', 'session-b', true, 0);
    service.getRoom('ROOM01', 1);

    expect(() =>
      service.submitMatchResult('ROOM01', {
        reportingPlayerId: 'player-a',
        reportingSessionId: 'session-a',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'bogus' as never,
      }),
    ).toThrow(BadRequestException);
  });
});
