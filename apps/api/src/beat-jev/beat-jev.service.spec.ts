import { ConflictException } from '@nestjs/common';
import { BeatJevService } from './beat-jev.service';
import { GAME_IDS } from './beat-jev.types';
import type { GameEngine, GameResult } from './beat-jev.types';
import { JevClientService } from './jev-client.service';

describe('BeatJevService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('chooses three different games, hides future games, and rejects stale actions', () => {
    const jevClient = {
      chooseAction: jest.fn(),
    } as unknown as JevClientService;
    const service = new BeatJevService(jevClient);
    const match = service.createMatch();

    expect(match.games).toHaveLength(3);
    expect(match.games[0]).toBe(match.game.gameId);
    expect(match.games.slice(1)).toEqual([null, null]);
    expect(match.playerWins).toBe(0);
    expect(match.jevWins).toBe(0);
    expect(match.status).toBe('PLAYING');
    expect(() => service.nextGame(match.id, match.revision)).toThrow(
      ConflictException,
    );
    expect(() =>
      service.playAction(match.id, 'invalid', match.revision + 1),
    ).toThrow(ConflictException);
  });

  it('replays a draw in the same game with the starter exchanged', async () => {
    const crypto =
      jest.requireActual<typeof import('node:crypto')>('node:crypto');
    jest
      .spyOn(crypto, 'randomInt')
      .mockReturnValueOnce(Math.floor(0.55 * 0x100000000))
      .mockReturnValue(0);
    const jevClient = {
      chooseAction: jest.fn().mockResolvedValue('code:111'),
    } as unknown as JevClientService;
    const service = new BeatJevService(jevClient);
    let match = service.createMatch();

    expect(match.game.gameId).toBe('codebreaker');
    expect(match.game.turn).toBe('PLAYER');
    for (let turn = 0; turn < 6; turn += 1) {
      match = service.playAction(match.id, 'code:111', match.revision);
      match = await service.continueJev(match.id, match.revision);
    }
    expect(match.status).toBe('ROUND_END');
    expect(match.history).toEqual([{ gameId: 'codebreaker', result: 'DRAW' }]);

    const replay = service.nextGame(match.id, match.revision);
    expect(replay.gameIndex).toBe(0);
    expect(replay.game.gameId).toBe('codebreaker');
    expect(replay.game.turn).toBe('JEV');
    expect(replay.games).toEqual(['codebreaker', null, null]);
  });

  it.each([
    [['PLAYER', 'PLAYER'], 2],
    [['PLAYER', 'JEV', 'PLAYER'], 3],
  ] as [GameResult[], number][])(
    'ends a match after two wins across at most three games',
    (results, gameCount) => {
      const service = new BeatJevService({} as JevClientService);
      const engines = Object.fromEntries(
        GAME_IDS.map((gameId) => [
          gameId,
          {
            create: () => ({ gameId, turn: 'PLAYER', result: null, data: {} }),
            view: (state) => ({
              gameId,
              turn: state.turn,
              result: state.result,
              data: {},
              legalActions: state.result === null ? ['finish'] : [],
            }),
            play: (state) => ({ ...state, result: results.shift() ?? 'DRAW' }),
          } satisfies GameEngine,
        ]),
      );
      Object.assign(service['engines'], engines);

      let match = service.createMatch();
      for (let index = 0; index < gameCount; index += 1) {
        match = service.playAction(match.id, 'finish', match.revision);
        if (index < gameCount - 1) {
          expect(match.status).toBe('ROUND_END');
          match = service.nextGame(match.id, match.revision);
        }
      }

      expect(match.status).toBe('COMPLETE');
      expect(match.playerWins).toBe(2);
      expect(match.history).toHaveLength(gameCount);
      expect(() => service.nextGame(match.id, match.revision)).toThrow(
        ConflictException,
      );
    },
  );
});
