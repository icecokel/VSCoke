import { GameState, Side } from './beat-jev.types';
import { strategyEngines } from './strategy-games';

const fixedRandom = (): number => 0;

describe('strategy games', () => {
  it('connect four applies gravity, detects a line, and preserves input', () => {
    const engine = strategyEngines['connect-four'];
    const state = engine.create(fixedRandom);
    const board = (state.data as { board: (Side | null)[][] }).board;
    const prepared: GameState = {
      ...state,
      data: {
        board: board.map((row, index) =>
          index === 4 ? ['PLAYER', 'PLAYER', 'PLAYER', null, null] : row,
        ),
      },
    };

    const next = engine.play(prepared, 'column:3', fixedRandom);

    expect(next.result).toBe('PLAYER');
    expect((next.data as { board: (Side | null)[][] }).board[4][3]).toBe(
      'PLAYER',
    );
    expect(
      (prepared.data as { board: (Side | null)[][] }).board[4][3],
    ).toBeNull();
    expect(() => engine.play(next, 'column:4', fixedRandom)).toThrow();
  });

  it.each([
    {
      name: 'vertical',
      cells: [10, 15, 20],
      column: 0,
    },
    {
      name: 'descending diagonal',
      cells: [5, 11, 17],
      column: 3,
    },
    {
      name: 'ascending diagonal',
      cells: [9, 13, 17],
      column: 1,
    },
  ])('connect four detects a $name line', ({ cells, column }) => {
    const engine = strategyEngines['connect-four'];
    const board = Array.from({ length: 5 }, () =>
      Array<Side | null>(5).fill(null),
    );
    for (const cell of cells) board[Math.floor(cell / 5)][cell % 5] = 'PLAYER';
    const state: GameState = {
      gameId: 'connect-four',
      turn: 'PLAYER',
      result: null,
      data: { board },
    };

    expect(engine.play(state, `column:${column}`, fixedRandom).result).toBe(
      'PLAYER',
    );
  });

  it('connect four refuses a full column', () => {
    const engine = strategyEngines['connect-four'];
    const state: GameState = {
      gameId: 'connect-four',
      turn: 'PLAYER',
      result: null,
      data: {
        board: Array.from({ length: 5 }, () => ['JEV', null, null, null, null]),
      },
    };

    expect(engine.view(state, 'PLAYER').legalActions).not.toContain('column:0');
    expect(() => engine.play(state, 'column:0', fixedRandom)).toThrow();
  });

  it('othello starts with a standard 8x8 board and four legal opening moves', () => {
    const engine = strategyEngines.othello;
    const state = engine.create(fixedRandom);
    const { board } = state.data as { board: (Side | null)[][] };

    expect(board).toHaveLength(8);
    expect(board.every((row) => row.length === 8)).toBe(true);
    expect(board[3].slice(3, 5)).toEqual(['JEV', 'PLAYER']);
    expect(board[4].slice(3, 5)).toEqual(['PLAYER', 'JEV']);
    expect(board.flat().filter((cell) => cell !== null)).toHaveLength(4);
    expect(engine.view(state, 'PLAYER').legalActions).toEqual([
      'cell:19',
      'cell:26',
      'cell:37',
      'cell:44',
    ]);
    expect(engine.view(state, 'JEV').legalActions).toEqual([]);
    expect(() => engine.play(state, 'cell:0', fixedRandom)).toThrow();

    const jevFirst = engine.create(() => 1);
    const jevFirstBoard = (jevFirst.data as { board: (Side | null)[][] }).board;
    expect(jevFirstBoard[3].slice(3, 5)).toEqual(['PLAYER', 'JEV']);
    expect(jevFirstBoard[4].slice(3, 5)).toEqual(['JEV', 'PLAYER']);
    expect(engine.view(jevFirst, 'JEV').legalActions).toEqual([
      'cell:19',
      'cell:26',
      'cell:37',
      'cell:44',
    ]);
  });

  it('othello flips stones in all eight directions without changing the input', () => {
    const engine = strategyEngines.othello;
    const board: (Side | null)[][] = Array.from({ length: 8 }, () =>
      Array<Side | null>(8).fill(null),
    );
    for (const rowStep of [-1, 0, 1]) {
      for (const columnStep of [-1, 0, 1]) {
        if (rowStep === 0 && columnStep === 0) continue;
        board[3 + rowStep][3 + columnStep] = 'JEV';
        board[3 + rowStep * 2][3 + columnStep * 2] = 'PLAYER';
      }
    }
    const state: GameState = {
      gameId: 'othello',
      turn: 'PLAYER',
      result: null,
      data: { board },
    };

    const next = engine.play(state, 'cell:27', fixedRandom);
    const nextBoard = (next.data as { board: (Side | null)[][] }).board;

    expect(nextBoard[3][3]).toBe('PLAYER');
    expect(nextBoard.flat().filter((cell) => cell === 'PLAYER')).toHaveLength(
      17,
    );
    expect(next.result).toBe('PLAYER');
    expect(board[3][3]).toBeNull();
    expect(board[2][2]).toBe('JEV');
  });

  it('othello automatically passes and ends when neither side can move', () => {
    const engine = strategyEngines.othello;
    const board: (Side | null)[][] = Array.from({ length: 8 }, () =>
      Array<Side>(8).fill('PLAYER'),
    );
    board[0][0] = null;
    board[0][1] = 'JEV';
    board[7][7] = null;
    board[7][6] = 'JEV';
    const state: GameState = {
      gameId: 'othello',
      turn: 'PLAYER',
      result: null,
      data: { board },
    };

    const next = engine.play(state, 'cell:0', fixedRandom);

    expect(next.turn).toBe('PLAYER');
    expect(engine.view(next, 'PLAYER').legalActions).toEqual(['cell:63']);
    expect((next.data as { board: (Side | null)[][] }).board[0][1]).toBe(
      'PLAYER',
    );
    const finished = engine.play(next, 'cell:63', fixedRandom);
    expect(finished.result).toBe('PLAYER');
    expect(engine.view(finished, 'PLAYER').legalActions).toEqual([]);
    expect(() => engine.play(finished, 'cell:63', fixedRandom)).toThrow();
  });

  it.each([
    { playerDiscs: 30, result: 'DRAW' },
    { playerDiscs: 29, result: 'JEV' },
  ] as const)(
    'othello uses disc majority at the end: $result',
    ({ playerDiscs, result }) => {
      const engine = strategyEngines.othello;
      const board: (Side | null)[][] = Array.from({ length: 8 }, () =>
        Array<Side>(8).fill('JEV'),
      );
      board[0][0] = null;
      board[0][2] = 'PLAYER';
      const otherPlayerCells = Array.from({ length: 64 }, (_, cell) => cell)
        .filter((cell) => {
          const row = Math.floor(cell / 8);
          const column = cell % 8;
          return row > 0 && column > 0 && row !== column;
        })
        .slice(0, playerDiscs - 1);
      for (const cell of otherPlayerCells) {
        board[Math.floor(cell / 8)][cell % 8] = 'PLAYER';
      }
      const state: GameState = {
        gameId: 'othello',
        turn: 'PLAYER',
        result: null,
        data: { board },
      };

      expect(engine.play(state, 'cell:0', fixedRandom).result).toBe(result);
    },
  );

  it('dots and boxes awards both adjacent boxes and grants another turn', () => {
    const engine = strategyEngines['dots-and-boxes'];
    const state: GameState = {
      gameId: 'dots-and-boxes',
      turn: 'PLAYER',
      result: null,
      data: {
        edges: ['h:0:0', 'h:0:1', 'h:1:0', 'h:1:1', 'v:0:0', 'v:0:2'],
        boxes: Array.from({ length: 3 }, () =>
          Array<Side | null>(3).fill(null),
        ),
        scores: { PLAYER: 0, JEV: 0 },
      },
    };

    const next = engine.play(state, 'edge:v:0:1', fixedRandom);
    const data = next.data as {
      scores: Record<Side, number>;
      boxes: (Side | null)[][];
    };

    expect(data.scores.PLAYER).toBe(2);
    expect(data.boxes[0]).toEqual(['PLAYER', 'PLAYER', null]);
    expect(next.turn).toBe('PLAYER');
  });

  it('isolation blocks the departed cell and detects a trapped opponent', () => {
    const engine = strategyEngines.isolation;
    const state: GameState = {
      gameId: 'isolation',
      turn: 'PLAYER',
      result: null,
      data: {
        positions: { PLAYER: 0, JEV: 24 },
        blocked: [19, 23],
      },
    };

    const next = engine.play(state, 'cell:1', fixedRandom);

    expect(next.result).toBe('PLAYER');
    expect((next.data as { blocked: number[] }).blocked).toContain(0);
    expect((state.data as { blocked: number[] }).blocked).not.toContain(0);
    expect(() => engine.play(state, 'cell:24', fixedRandom)).toThrow();
  });

  it('battleship hides the first choice and resolves simultaneous sinking', () => {
    const engine = strategyEngines.battleship;
    const previousShots = [
      { cell: 0, hit: true, sunk: false },
      { cell: 1, hit: true, sunk: true },
    ];
    const state: GameState = {
      gameId: 'battleship',
      turn: 'PLAYER',
      result: null,
      data: {
        ships: {
          PLAYER: [[0, 1], [2]],
          JEV: [[0, 1], [2]],
        },
        shots: { PLAYER: previousShots, JEV: previousShots },
        pending: {},
        lead: 'PLAYER',
        round: 3,
      },
    };

    const waiting = engine.play(state, 'cell:2', fixedRandom);
    const jevView = engine.view(waiting, 'JEV');

    expect(jevView.data.pending).toBe(false);
    expect(jevView.data).not.toHaveProperty('ships');
    expect(jevView.data.ownShots).toEqual(previousShots);
    expect(() => engine.play(state, 'cell:0', fixedRandom)).toThrow();
    expect(engine.play(waiting, 'cell:2', fixedRandom).result).toBe('DRAW');
  });

  it('battleship places two non-overlapping ships inside the board', () => {
    const engine = strategyEngines.battleship;
    for (let seed = 0; seed < 10; seed += 1) {
      let step = seed;
      const state = engine.create(() => {
        step = (step * 7 + 3) % 101;
        return step / 101;
      });
      const ships = (
        state.data as {
          ships: Record<Side, number[][]>;
        }
      ).ships;
      for (const side of ['PLAYER', 'JEV'] as const) {
        const [pair, single] = ships[side];
        const [first, second] = pair;
        expect(pair).toHaveLength(2);
        expect(single).toHaveLength(1);
        expect(new Set([...pair, ...single]).size).toBe(3);
        expect(
          [...pair, ...single].every((cell) => cell >= 0 && cell < 16),
        ).toBe(true);
        expect(
          (second === first + 1 &&
            Math.floor(first / 4) === Math.floor(second / 4)) ||
            second === first + 4,
        ).toBe(true);
      }
    }
  });

  it('codebreaker handles duplicate colors and keeps guesses private until both submit', () => {
    const engine = strategyEngines.codebreaker;
    const state: GameState = {
      gameId: 'codebreaker',
      turn: 'PLAYER',
      result: null,
      data: {
        secret: '001',
        guesses: { PLAYER: [], JEV: [] },
        pending: {},
        lead: 'PLAYER',
        round: 1,
      },
    };

    const waiting = engine.play(state, 'code:001', fixedRandom);
    const jevView = engine.view(waiting, 'JEV');
    expect(jevView.data.ownGuesses).toEqual([]);
    expect(JSON.stringify(jevView.data)).not.toContain('001');

    const next = engine.play(waiting, 'code:010', fixedRandom);
    expect(next.result).toBe('PLAYER');
    expect(engine.view(next, 'JEV').data.ownGuesses).toEqual([
      { code: '010', exact: 1, colorOnly: 2 },
    ]);
  });

  it('codebreaker draws when both solve the same round or both fail six rounds', () => {
    const engine = strategyEngines.codebreaker;
    const state: GameState = {
      gameId: 'codebreaker',
      turn: 'PLAYER',
      result: null,
      data: {
        secret: '001',
        guesses: { PLAYER: [], JEV: [] },
        pending: {},
        lead: 'PLAYER',
        round: 1,
      },
    };
    const first = engine.play(state, 'code:001', fixedRandom);
    expect(engine.play(first, 'code:001', fixedRandom).result).toBe('DRAW');

    const finalRound: GameState = {
      ...state,
      data: { ...(state.data as Record<string, unknown>), round: 6 },
    };
    const waiting = engine.play(finalRound, 'code:222', fixedRandom);
    expect(engine.play(waiting, 'code:333', fixedRandom).result).toBe('DRAW');
  });

  it.each(Object.entries(strategyEngines))(
    '%s reaches a result through legal actions',
    (_name, engine) => {
      let state = engine.create(fixedRandom);
      for (let move = 0; move < 80 && state.result === null; move += 1) {
        const actions = engine.view(state, state.turn).legalActions;
        expect(actions.length).toBeGreaterThan(0);
        state = engine.play(state, actions[0], fixedRandom);
      }
      expect(state.result).not.toBeNull();
    },
  );
});
