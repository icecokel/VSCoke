export const GAME_IDS = [
  'connect-four',
  'othello',
  'dots-and-boxes',
  'isolation',
  'battleship',
  'codebreaker',
  'yacht-dice',
  'dice-stop',
  'bomb-dodge',
  'blind-card',
] as const;

export type GameId = (typeof GAME_IDS)[number];
export type Side = 'PLAYER' | 'JEV';
export type GameResult = Side | 'DRAW' | null;
export type RandomSource = () => number;

export interface GameState {
  gameId: GameId;
  turn: Side;
  result: GameResult;
  data: unknown;
}

export interface GameView {
  gameId: GameId;
  turn: Side;
  result: GameResult;
  data: Record<string, unknown>;
  legalActions: string[];
}

export interface GameEngine {
  create: (random: RandomSource) => GameState;
  view: (state: GameState, viewer: Side) => GameView;
  play: (state: GameState, action: string, random: RandomSource) => GameState;
}
