import type {
  GameEngine,
  GameResult,
  GameState,
  GameView,
  RandomSource,
  Side,
} from './beat-jev.types';

const otherSide = (side: Side): Side => (side === 'PLAYER' ? 'JEV' : 'PLAYER');

const randomIndex = (size: number, random: RandomSource): number =>
  Math.floor(random() * size);

const rollDie = (random: RandomSource): number => randomIndex(6, random) + 1;

const winnerForTotals = (totals: Record<Side, number>): GameResult =>
  totals.PLAYER === totals.JEV
    ? 'DRAW'
    : totals.PLAYER > totals.JEV
      ? 'PLAYER'
      : 'JEV';

const yachtCategories = [
  'choice',
  'four-kind',
  'full-house',
  'small-straight',
  'large-straight',
  'yacht',
] as const;

type YachtCategory = (typeof yachtCategories)[number];

interface YachtData {
  dice: number[];
  rollsUsed: number;
  rounds: Record<Side, number>;
  scorecards: Record<Side, Partial<Record<YachtCategory, number>>>;
}

const scoreYacht = (dice: number[], category: YachtCategory): number => {
  const counts = Array.from(
    { length: 6 },
    (_, index) => dice.filter((die) => die === index + 1).length,
  );
  const total = dice.reduce((sum, die) => sum + die, 0);
  const unique = new Set(dice);

  switch (category) {
    case 'choice':
      return total;
    case 'four-kind':
      return counts.some((count) => count >= 4) ? total : 0;
    case 'full-house':
      return counts.includes(3) && counts.includes(2) ? total : 0;
    case 'small-straight':
      return [1, 2, 3].some((start) =>
        [0, 1, 2, 3].every((offset) => unique.has(start + offset)),
      )
        ? 15
        : 0;
    case 'large-straight':
      return [1, 2].some((start) =>
        [0, 1, 2, 3, 4].every((offset) => unique.has(start + offset)),
      )
        ? 30
        : 0;
    case 'yacht':
      return counts.includes(5) ? 50 : 0;
  }
};

const yachtActions = (state: GameState, data: YachtData): string[] => {
  if (state.result !== null) return [];

  const rerolls =
    data.rollsUsed < 3
      ? Array.from(
          { length: 31 },
          (_, mask) => `hold:${mask.toString(2).padStart(5, '0')}`,
        )
      : [];
  const scoring = yachtCategories
    .filter((category) => data.scorecards[state.turn][category] === undefined)
    .map((category) => `score:${category}`);
  return [...rerolls, ...scoring];
};

const yachtDice: GameEngine = {
  create: (random): GameState => ({
    gameId: 'yacht-dice',
    turn: randomIndex(2, random) === 0 ? 'PLAYER' : 'JEV',
    result: null,
    data: {
      dice: Array.from({ length: 5 }, () => rollDie(random)),
      rollsUsed: 1,
      rounds: { PLAYER: 0, JEV: 0 },
      scorecards: { PLAYER: {}, JEV: {} },
    } satisfies YachtData,
  }),
  view: (state, viewer): GameView => {
    const data = state.data as YachtData;
    return {
      gameId: state.gameId,
      turn: state.turn,
      result: state.result,
      data: {
        dice: [...data.dice],
        rollsUsed: data.rollsUsed,
        rounds: { ...data.rounds },
        scorecards: {
          PLAYER: { ...data.scorecards.PLAYER },
          JEV: { ...data.scorecards.JEV },
        },
        availableScores: Object.fromEntries(
          yachtCategories.map((category) => [
            category,
            scoreYacht(data.dice, category),
          ]),
        ),
      },
      legalActions: viewer === state.turn ? yachtActions(state, data) : [],
    };
  },
  play: (state, action, random): GameState => {
    const data = state.data as YachtData;
    if (!yachtActions(state, data).includes(action)) {
      throw new Error('Invalid yacht action');
    }

    if (action.startsWith('hold:')) {
      const mask = action.slice(5);
      return {
        ...state,
        data: {
          ...data,
          dice: data.dice.map((die, index) =>
            mask[index] === '1' ? die : rollDie(random),
          ),
          rollsUsed: data.rollsUsed + 1,
        } satisfies YachtData,
      };
    }

    const category = action.slice(6) as YachtCategory;
    const scorecards: YachtData['scorecards'] = {
      ...data.scorecards,
      [state.turn]: {
        ...data.scorecards[state.turn],
        [category]: scoreYacht(data.dice, category),
      },
    };
    const rounds = {
      ...data.rounds,
      [state.turn]: data.rounds[state.turn] + 1,
    };
    const isFinished = rounds.PLAYER === 3 && rounds.JEV === 3;
    const totals: Record<Side, number> = {
      PLAYER: Object.values(scorecards.PLAYER).reduce(
        (sum, value) => sum + value,
        0,
      ),
      JEV: Object.values(scorecards.JEV).reduce((sum, value) => sum + value, 0),
    };

    return {
      ...state,
      turn: isFinished ? state.turn : otherSide(state.turn),
      result: isFinished ? winnerForTotals(totals) : null,
      data: {
        dice: isFinished
          ? [...data.dice]
          : Array.from({ length: 5 }, () => rollDie(random)),
        rollsUsed: isFinished ? data.rollsUsed : 1,
        rounds,
        scorecards,
      } satisfies YachtData,
    };
  },
};

interface DiceStopData {
  rounds: Record<Side, number>;
  totals: Record<Side, number>;
  currentPoints: number;
  rollsUsed: number;
  lastRoll: { side: Side; value: number } | null;
}

const diceStopActions = (state: GameState, data: DiceStopData): string[] =>
  state.result !== null
    ? []
    : data.rollsUsed === 0
      ? ['roll']
      : ['roll', 'stop'];

const finishDiceStopTurn = (
  state: GameState,
  data: DiceStopData,
  points: number,
): GameState => {
  const rounds = { ...data.rounds, [state.turn]: data.rounds[state.turn] + 1 };
  const totals = {
    ...data.totals,
    [state.turn]: data.totals[state.turn] + points,
  };
  const isFinished = rounds.PLAYER === 3 && rounds.JEV === 3;
  return {
    ...state,
    turn: isFinished ? state.turn : otherSide(state.turn),
    result: isFinished ? winnerForTotals(totals) : null,
    data: {
      ...data,
      rounds,
      totals,
      currentPoints: 0,
      rollsUsed: 0,
    } satisfies DiceStopData,
  };
};

const diceStop: GameEngine = {
  create: (random): GameState => ({
    gameId: 'dice-stop',
    turn: randomIndex(2, random) === 0 ? 'PLAYER' : 'JEV',
    result: null,
    data: {
      rounds: { PLAYER: 0, JEV: 0 },
      totals: { PLAYER: 0, JEV: 0 },
      currentPoints: 0,
      rollsUsed: 0,
      lastRoll: null,
    } satisfies DiceStopData,
  }),
  view: (state, viewer): GameView => {
    const data = state.data as DiceStopData;
    return {
      gameId: state.gameId,
      turn: state.turn,
      result: state.result,
      data: {
        rounds: { ...data.rounds },
        totals: { ...data.totals },
        currentPoints: data.currentPoints,
        rollsUsed: data.rollsUsed,
        lastRoll: data.lastRoll ? { ...data.lastRoll } : null,
      },
      legalActions: viewer === state.turn ? diceStopActions(state, data) : [],
    };
  },
  play: (state, action, random): GameState => {
    const data = state.data as DiceStopData;
    if (!diceStopActions(state, data).includes(action)) {
      throw new Error('Invalid dice-stop action');
    }
    if (action === 'stop')
      return finishDiceStopTurn(state, data, data.currentPoints);

    const value = rollDie(random);
    const nextData: DiceStopData = {
      ...data,
      currentPoints: value === 1 ? 0 : data.currentPoints + value,
      rollsUsed: data.rollsUsed + 1,
      lastRoll: { side: state.turn, value },
    };
    if (value === 1 || nextData.rollsUsed === 5) {
      return finishDiceStopTurn(
        state,
        nextData,
        value === 1 ? 0 : nextData.currentPoints,
      );
    }
    return { ...state, data: nextData };
  },
};

interface BombDodgeData {
  bombPosition: number;
  opened: number[];
}

const bombActions = (state: GameState, data: BombDodgeData): string[] =>
  state.result === null
    ? Array.from({ length: 16 }, (_, index) => index)
        .filter((index) => !data.opened.includes(index))
        .map((index) => `pick:${index}`)
    : [];

const bombDodge: GameEngine = {
  create: (random): GameState => ({
    gameId: 'bomb-dodge',
    turn: randomIndex(2, random) === 0 ? 'PLAYER' : 'JEV',
    result: null,
    data: {
      bombPosition: randomIndex(16, random),
      opened: [],
    } satisfies BombDodgeData,
  }),
  view: (state, viewer): GameView => {
    const data = state.data as BombDodgeData;
    return {
      gameId: state.gameId,
      turn: state.turn,
      result: state.result,
      data: {
        opened: [...data.opened],
        bombPosition: state.result === null ? null : data.bombPosition,
      },
      legalActions: viewer === state.turn ? bombActions(state, data) : [],
    };
  },
  play: (state, action): GameState => {
    const data = state.data as BombDodgeData;
    if (!bombActions(state, data).includes(action)) {
      throw new Error('Invalid bomb-dodge action');
    }
    const position = Number(action.slice(5));
    if (position === data.bombPosition) {
      return { ...state, result: otherSide(state.turn) };
    }
    return {
      ...state,
      turn: otherSide(state.turn),
      data: {
        ...data,
        opened: [...data.opened, position],
      } satisfies BombDodgeData,
    };
  },
};

interface BlindCardData {
  cards: number[];
  chosenPositions: Record<Side, number | null>;
}

const cardActions = (state: GameState, data: BlindCardData): string[] =>
  state.result === null
    ? data.cards
        .map((_, index) => index)
        .filter(
          (index) =>
            index !== data.chosenPositions.PLAYER &&
            index !== data.chosenPositions.JEV,
        )
        .map((index) => `pick:${index}`)
    : [];

const blindCard: GameEngine = {
  create: (random): GameState => {
    const cards = Array.from({ length: 10 }, (_, index) => index + 1);
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1, random);
      [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
    }
    return {
      gameId: 'blind-card',
      turn: 'PLAYER',
      result: null,
      data: {
        cards,
        chosenPositions: { PLAYER: null, JEV: null },
      } satisfies BlindCardData,
    };
  },
  view: (state, viewer): GameView => {
    const data = state.data as BlindCardData;
    const isRevealed = state.result !== null;
    const playerPosition = data.chosenPositions.PLAYER;
    const jevPosition = data.chosenPositions.JEV;
    return {
      gameId: state.gameId,
      turn: state.turn,
      result: state.result,
      data: {
        available: data.cards
          .map((_, index) => index)
          .filter((index) => index !== playerPosition && index !== jevPosition),
        chosenPositions: {
          PLAYER: isRevealed || viewer === 'PLAYER' ? playerPosition : null,
          JEV: isRevealed || viewer === 'JEV' ? jevPosition : null,
        },
        revealed:
          isRevealed && playerPosition !== null && jevPosition !== null
            ? {
                PLAYER: data.cards[playerPosition],
                JEV: data.cards[jevPosition],
              }
            : null,
      },
      legalActions: viewer === state.turn ? cardActions(state, data) : [],
    };
  },
  play: (state, action): GameState => {
    const data = state.data as BlindCardData;
    if (!cardActions(state, data).includes(action)) {
      throw new Error('Invalid blind-card action');
    }
    const position = Number(action.slice(5));
    const chosenPositions = { ...data.chosenPositions, [state.turn]: position };
    if (state.turn === 'PLAYER') {
      return {
        ...state,
        turn: 'JEV',
        data: { ...data, chosenPositions } satisfies BlindCardData,
      };
    }
    const playerPosition = chosenPositions.PLAYER;
    if (playerPosition === null) {
      throw new Error('Player must choose first');
    }
    return {
      ...state,
      result:
        data.cards[playerPosition] > data.cards[position] ? 'PLAYER' : 'JEV',
      data: { ...data, chosenPositions } satisfies BlindCardData,
    };
  },
};

export const luckEngines = {
  'yacht-dice': yachtDice,
  'dice-stop': diceStop,
  'bomb-dodge': bombDodge,
  'blind-card': blindCard,
} satisfies Record<
  'yacht-dice' | 'dice-stop' | 'bomb-dodge' | 'blind-card',
  GameEngine
>;
