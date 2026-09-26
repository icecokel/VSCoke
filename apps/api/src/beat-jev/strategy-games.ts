import {
  GameEngine,
  GameState,
  GameView,
  RandomSource,
  Side,
} from './beat-jev.types';

type Board = (Side | null)[][];
type Scores = Record<Side, number>;
type Positions = Record<Side, number>;
type Shots = Record<Side, Shot[]>;
type Guesses = Record<Side, Guess[]>;

interface Shot {
  cell: number;
  hit: boolean;
  sunk: boolean;
}

interface Guess {
  code: string;
  exact: number;
  colorOnly: number;
}

interface BattleshipData {
  ships: Record<Side, number[][]>;
  shots: Shots;
  pending: Partial<Record<Side, number>>;
  lead: Side;
  round: number;
}

interface CodebreakerData {
  secret: string;
  guesses: Guesses;
  pending: Partial<Record<Side, string>>;
  lead: Side;
  round: number;
}

const otherSide = (side: Side): Side => (side === 'PLAYER' ? 'JEV' : 'PLAYER');

const firstSide = (random: RandomSource): Side =>
  random() < 0.5 ? 'PLAYER' : 'JEV';

const randomIndex = (random: RandomSource, length: number): number =>
  Math.min(length - 1, Math.floor(random() * length));

const gameView = (
  state: GameState,
  viewer: Side,
  data: Record<string, unknown>,
  actions: string[],
): GameView => ({
  gameId: state.gameId,
  turn: state.turn,
  result: state.result,
  data,
  legalActions: state.result === null && state.turn === viewer ? actions : [],
});

const requireAction = (
  state: GameState,
  action: string,
  actions: string[],
): void => {
  if (state.result !== null || !actions.includes(action)) {
    throw new Error('Invalid game action');
  }
};

const emptyBoard = (size: number): Board =>
  Array.from({ length: size }, () => Array<Side | null>(size).fill(null));

const lines = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

const hasFour = (board: Board, side: Side): boolean => {
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      if (board[row][column] !== side) continue;
      for (const [rowStep, columnStep] of lines) {
        if (
          Array.from({ length: 4 }, (_, offset) => {
            const nextRow = row + rowStep * offset;
            const nextColumn = column + columnStep * offset;
            return (
              nextRow >= 0 &&
              nextRow < 5 &&
              nextColumn >= 0 &&
              nextColumn < 5 &&
              board[nextRow][nextColumn] === side
            );
          }).every(Boolean)
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

const connectActions = (board: Board): string[] =>
  board[0].flatMap((cell, column) =>
    cell === null ? [`column:${column}`] : [],
  );

const connectFour: GameEngine = {
  create: (random) => ({
    gameId: 'connect-four',
    turn: firstSide(random),
    result: null,
    data: { board: emptyBoard(5) },
  }),
  view: (state, viewer) => {
    const { board } = state.data as { board: Board };
    return gameView(state, viewer, { board }, connectActions(board));
  },
  play: (state, action) => {
    const { board } = state.data as { board: Board };
    requireAction(state, action, connectActions(board));
    const column = Number(action.split(':')[1]);
    const nextBoard = board.map((row) => [...row]);
    const row = nextBoard.findLastIndex((cells) => cells[column] === null);
    nextBoard[row][column] = state.turn;
    return {
      ...state,
      turn: otherSide(state.turn),
      result: hasFour(nextBoard, state.turn)
        ? state.turn
        : connectActions(nextBoard).length === 0
          ? 'DRAW'
          : null,
      data: { board: nextBoard },
    };
  },
};

const directions = [-1, 0, 1].flatMap((rowStep) =>
  [-1, 0, 1]
    .filter((columnStep) => rowStep !== 0 || columnStep !== 0)
    .map((columnStep) => [rowStep, columnStep] as const),
);

const flipsAt = (board: Board, cell: number, side: Side): number[] => {
  const size = board.length;
  const row = Math.floor(cell / size);
  const column = cell % size;
  if (board[row][column] !== null) return [];
  return directions.flatMap(([rowStep, columnStep]) => {
    const captured: number[] = [];
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;
    while (
      nextRow >= 0 &&
      nextRow < size &&
      nextColumn >= 0 &&
      nextColumn < size &&
      board[nextRow][nextColumn] === otherSide(side)
    ) {
      captured.push(nextRow * size + nextColumn);
      nextRow += rowStep;
      nextColumn += columnStep;
    }
    return nextRow >= 0 &&
      nextRow < size &&
      nextColumn >= 0 &&
      nextColumn < size &&
      board[nextRow][nextColumn] === side
      ? captured
      : [];
  });
};

const othelloActions = (board: Board, side: Side): string[] =>
  Array.from({ length: board.length ** 2 }, (_, cell) => cell)
    .filter((cell) => flipsAt(board, cell, side).length > 0)
    .map((cell) => `cell:${cell}`);

const othello: GameEngine = {
  create: (random) => {
    const board = emptyBoard(8);
    const first = firstSide(random);
    const second = otherSide(first);
    board[3][3] = second;
    board[3][4] = first;
    board[4][3] = first;
    board[4][4] = second;
    return {
      gameId: 'othello',
      turn: first,
      result: null,
      data: { board },
    };
  },
  view: (state, viewer) => {
    const { board } = state.data as { board: Board };
    return gameView(
      state,
      viewer,
      { board },
      othelloActions(board, state.turn),
    );
  },
  play: (state, action) => {
    const { board } = state.data as { board: Board };
    requireAction(state, action, othelloActions(board, state.turn));
    const cell = Number(action.split(':')[1]);
    const nextBoard = board.map((row) => [...row]);
    nextBoard[Math.floor(cell / board.length)][cell % board.length] =
      state.turn;
    for (const flipped of flipsAt(board, cell, state.turn)) {
      nextBoard[Math.floor(flipped / board.length)][flipped % board.length] =
        state.turn;
    }
    const opposite = otherSide(state.turn);
    const oppositeActions = othelloActions(nextBoard, opposite);
    const ownActions = othelloActions(nextBoard, state.turn);
    const isDone = oppositeActions.length === 0 && ownActions.length === 0;
    const cells = nextBoard.flat();
    const ownCount = cells.filter((value) => value === state.turn).length;
    const oppositeCount = cells.filter((value) => value === opposite).length;
    return {
      ...state,
      turn: oppositeActions.length > 0 ? opposite : state.turn,
      result: isDone
        ? ownCount === oppositeCount
          ? 'DRAW'
          : ownCount > oppositeCount
            ? state.turn
            : opposite
        : null,
      data: { board: nextBoard },
    };
  },
};

const allEdges = [
  ...Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) => `h:${row}:${column}`),
  ).flat(),
  ...Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => `v:${row}:${column}`),
  ).flat(),
];

const boxEdges = (row: number, column: number): string[] => [
  `h:${row}:${column}`,
  `h:${row + 1}:${column}`,
  `v:${row}:${column}`,
  `v:${row}:${column + 1}`,
];

const dotsActions = (edges: string[]): string[] =>
  allEdges
    .filter((edge) => !edges.includes(edge))
    .map((edge) => `edge:${edge}`);

const dotsAndBoxes: GameEngine = {
  create: (random) => ({
    gameId: 'dots-and-boxes',
    turn: firstSide(random),
    result: null,
    data: {
      edges: [] as string[],
      boxes: Array.from({ length: 3 }, () => Array<Side | null>(3).fill(null)),
      scores: { PLAYER: 0, JEV: 0 },
    },
  }),
  view: (state, viewer) => {
    const data = state.data as {
      edges: string[];
      boxes: Board;
      scores: Scores;
    };
    return gameView(state, viewer, { ...data }, dotsActions(data.edges));
  },
  play: (state, action) => {
    const data = state.data as {
      edges: string[];
      boxes: Board;
      scores: Scores;
    };
    requireAction(state, action, dotsActions(data.edges));
    const edges = [...data.edges, action.slice(5)];
    const boxes = data.boxes.map((row) => [...row]);
    let claimed = 0;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        if (
          boxes[row][column] === null &&
          boxEdges(row, column).every((edge) => edges.includes(edge))
        ) {
          boxes[row][column] = state.turn;
          claimed += 1;
        }
      }
    }
    const scores = {
      ...data.scores,
      [state.turn]: data.scores[state.turn] + claimed,
    };
    return {
      ...state,
      turn: claimed > 0 ? state.turn : otherSide(state.turn),
      result:
        edges.length === allEdges.length
          ? scores.PLAYER > scores.JEV
            ? 'PLAYER'
            : 'JEV'
          : null,
      data: { edges, boxes, scores },
    };
  },
};

const isolationActions = (
  positions: Positions,
  blocked: number[],
  side: Side,
): string[] => {
  const cell = positions[side];
  const row = Math.floor(cell / 5);
  const column = cell % 5;
  return [
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ]
    .filter(
      ([nextRow, nextColumn]) =>
        nextRow >= 0 && nextRow < 5 && nextColumn >= 0 && nextColumn < 5,
    )
    .map(([nextRow, nextColumn]) => nextRow * 5 + nextColumn)
    .filter(
      (nextCell) =>
        nextCell !== positions[otherSide(side)] && !blocked.includes(nextCell),
    )
    .map((nextCell) => `cell:${nextCell}`);
};

const isolation: GameEngine = {
  create: (random) => ({
    gameId: 'isolation',
    turn: firstSide(random),
    result: null,
    data: { positions: { PLAYER: 0, JEV: 24 }, blocked: [] as number[] },
  }),
  view: (state, viewer) => {
    const data = state.data as { positions: Positions; blocked: number[] };
    return gameView(
      state,
      viewer,
      { ...data },
      isolationActions(data.positions, data.blocked, state.turn),
    );
  },
  play: (state, action) => {
    const data = state.data as { positions: Positions; blocked: number[] };
    requireAction(
      state,
      action,
      isolationActions(data.positions, data.blocked, state.turn),
    );
    const positions = {
      ...data.positions,
      [state.turn]: Number(action.split(':')[1]),
    };
    const blocked = [...data.blocked, data.positions[state.turn]];
    const opposite = otherSide(state.turn);
    return {
      ...state,
      turn: opposite,
      result:
        isolationActions(positions, blocked, opposite).length === 0
          ? state.turn
          : null,
      data: { positions, blocked },
    };
  },
};

const placeShips = (random: RandomSource): number[][] => {
  const pairs = Array.from({ length: 16 }, (_, cell) => [
    ...(cell % 4 < 3 ? [[cell, cell + 1]] : []),
    ...(cell < 12 ? [[cell, cell + 4]] : []),
  ]).flat();
  const pair = pairs[randomIndex(random, pairs.length)];
  const remaining = Array.from({ length: 16 }, (_, cell) => cell).filter(
    (cell) => !pair.includes(cell),
  );
  return [pair, [remaining[randomIndex(random, remaining.length)]]];
};

const shotResult = (cell: number, ships: number[][], cells: number[]): Shot => {
  const ship = ships.find((part) => part.includes(cell));
  return {
    cell,
    hit: ship !== undefined,
    sunk: ship !== undefined && ship.every((part) => cells.includes(part)),
  };
};

const battleshipActions = (shots: Shot[]): string[] =>
  Array.from({ length: 16 }, (_, cell) => cell)
    .filter((cell) => !shots.some((shot) => shot.cell === cell))
    .map((cell) => `cell:${cell}`);

const battleship: GameEngine = {
  create: (random) => {
    const lead = firstSide(random);
    return {
      gameId: 'battleship',
      turn: lead,
      result: null,
      data: {
        ships: { PLAYER: placeShips(random), JEV: placeShips(random) },
        shots: { PLAYER: [], JEV: [] },
        pending: {},
        lead,
        round: 1,
      },
    };
  },
  view: (state, viewer) => {
    const data = state.data as BattleshipData;
    return gameView(
      state,
      viewer,
      {
        ownShips: data.ships[viewer],
        ownShots: data.shots[viewer],
        opponentShots: data.shots[otherSide(viewer)],
        round: data.round,
        pending: data.pending[viewer] !== undefined,
      },
      battleshipActions(data.shots[state.turn]),
    );
  },
  play: (state, action) => {
    const data = state.data as BattleshipData;
    requireAction(state, action, battleshipActions(data.shots[state.turn]));
    const pending = {
      ...data.pending,
      [state.turn]: Number(action.split(':')[1]),
    };
    const opposite = otherSide(state.turn);
    if (pending[opposite] === undefined) {
      return {
        ...state,
        turn: opposite,
        data: { ...data, pending },
      };
    }
    const playerCell = pending.PLAYER;
    const jevCell = pending.JEV;
    if (playerCell === undefined || jevCell === undefined) {
      throw new Error('Incomplete battleship round');
    }
    const playerCells = [
      ...data.shots.PLAYER.map((shot) => shot.cell),
      playerCell,
    ];
    const jevCells = [...data.shots.JEV.map((shot) => shot.cell), jevCell];
    const shots: Shots = {
      PLAYER: [
        ...data.shots.PLAYER,
        shotResult(playerCell, data.ships.JEV, playerCells),
      ],
      JEV: [
        ...data.shots.JEV,
        shotResult(jevCell, data.ships.PLAYER, jevCells),
      ],
    };
    const playerSank = data.ships.JEV.flat().every((cell) =>
      playerCells.includes(cell),
    );
    const jevSank = data.ships.PLAYER.flat().every((cell) =>
      jevCells.includes(cell),
    );
    return {
      ...state,
      turn: data.lead,
      result:
        playerSank && jevSank
          ? 'DRAW'
          : playerSank
            ? 'PLAYER'
            : jevSank
              ? 'JEV'
              : null,
      data: { ...data, shots, pending: {}, round: data.round + 1 },
    };
  },
};

const codes = Array.from({ length: 64 }, (_, value) =>
  value.toString(4).padStart(3, '0'),
);

const codeHint = (code: string, secret: string): Omit<Guess, 'code'> => {
  let exact = 0;
  const codeCounts = [0, 0, 0, 0];
  const secretCounts = [0, 0, 0, 0];
  for (let index = 0; index < 3; index += 1) {
    if (code[index] === secret[index]) {
      exact += 1;
    } else {
      codeCounts[Number(code[index])] += 1;
      secretCounts[Number(secret[index])] += 1;
    }
  }
  return {
    exact,
    colorOnly: codeCounts.reduce(
      (sum, count, color) => sum + Math.min(count, secretCounts[color]),
      0,
    ),
  };
};

const codebreaker: GameEngine = {
  create: (random) => {
    const lead = firstSide(random);
    return {
      gameId: 'codebreaker',
      turn: lead,
      result: null,
      data: {
        secret: Array.from({ length: 3 }, () => randomIndex(random, 4)).join(
          '',
        ),
        guesses: { PLAYER: [], JEV: [] },
        pending: {},
        lead,
        round: 1,
      },
    };
  },
  view: (state, viewer) => {
    const data = state.data as CodebreakerData;
    return gameView(
      state,
      viewer,
      {
        ownGuesses: data.guesses[viewer],
        round: data.round,
        pending: data.pending[viewer] !== undefined,
        remaining: Math.max(0, 7 - data.round),
      },
      codes.map((code) => `code:${code}`),
    );
  },
  play: (state, action) => {
    requireAction(
      state,
      action,
      codes.map((code) => `code:${code}`),
    );
    const data = state.data as CodebreakerData;
    const pending = { ...data.pending, [state.turn]: action.slice(5) };
    const opposite = otherSide(state.turn);
    if (pending[opposite] === undefined) {
      return { ...state, turn: opposite, data: { ...data, pending } };
    }
    const playerCode = pending.PLAYER;
    const jevCode = pending.JEV;
    if (playerCode === undefined || jevCode === undefined) {
      throw new Error('Incomplete codebreaker round');
    }
    const playerGuess = {
      code: playerCode,
      ...codeHint(playerCode, data.secret),
    };
    const jevGuess = { code: jevCode, ...codeHint(jevCode, data.secret) };
    const guesses: Guesses = {
      PLAYER: [...data.guesses.PLAYER, playerGuess],
      JEV: [...data.guesses.JEV, jevGuess],
    };
    return {
      ...state,
      turn: data.lead,
      result:
        playerGuess.exact === 3 && jevGuess.exact === 3
          ? 'DRAW'
          : playerGuess.exact === 3
            ? 'PLAYER'
            : jevGuess.exact === 3
              ? 'JEV'
              : data.round === 6
                ? 'DRAW'
                : null,
      data: { ...data, guesses, pending: {}, round: data.round + 1 },
    };
  },
};

export const strategyEngines = {
  'connect-four': connectFour,
  othello,
  'dots-and-boxes': dotsAndBoxes,
  isolation,
  battleship,
  codebreaker,
} satisfies Partial<Record<GameState['gameId'], GameEngine>>;
