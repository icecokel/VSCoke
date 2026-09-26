import type { GameState, RandomSource } from './beat-jev.types';
import { luckEngines } from './luck-games';

const randomSequence = (...values: number[]): RandomSource => {
  let index = 0;
  return () => values[index++] ?? 0;
};

const withDice = (dice: number[]): GameState =>
  luckEngines['yacht-dice'].create(
    randomSequence(0, ...dice.map((die) => (die - 1) / 6)),
  );

describe('luck games', () => {
  describe('yacht dice', () => {
    it('publishes the current score for every category', () => {
      const state = withDice([2, 2, 2, 5, 5]);
      expect(
        luckEngines['yacht-dice'].view(state, 'PLAYER').data.availableScores,
      ).toEqual({
        choice: 16,
        'four-kind': 0,
        'full-house': 16,
        'small-straight': 0,
        'large-straight': 0,
        yacht: 0,
      });
    });

    it.each([
      ['choice', [1, 2, 3, 4, 5], 15],
      ['four-kind', [4, 4, 4, 4, 2], 18],
      ['full-house', [2, 2, 2, 5, 5], 16],
      ['full-house', [5, 5, 5, 5, 5], 0],
      ['small-straight', [1, 2, 3, 4, 4], 15],
      ['large-straight', [2, 3, 4, 5, 6], 30],
      ['yacht', [6, 6, 6, 6, 6], 50],
    ] as const)('%s scores %i dice as %i', (category, dice, expected) => {
      const state = withDice([...dice]);
      const next = luckEngines['yacht-dice'].play(
        state,
        `score:${category}`,
        () => 0,
      );
      expect(
        luckEngines['yacht-dice'].view(next, 'PLAYER').data.scorecards,
      ).toEqual({
        PLAYER: { [category]: expected },
        JEV: {},
      });
    });

    it('preserves held dice, limits rerolls, and rejects used categories', () => {
      const engine = luckEngines['yacht-dice'];
      const state = withDice([1, 2, 3, 4, 5]);
      const original = JSON.stringify(state);
      const second = engine.play(state, 'hold:10101', () => 5 / 6);
      expect(engine.view(second, 'PLAYER').data.dice).toEqual([1, 6, 3, 6, 5]);
      expect(JSON.stringify(state)).toBe(original);
      const third = engine.play(second, 'hold:00000', () => 0);
      expect(engine.view(third, 'PLAYER').legalActions).not.toContain(
        'hold:00000',
      );
      expect(() => engine.play(third, 'hold:00000', () => 0)).toThrow();
      const scored = engine.play(third, 'score:choice', () => 0);
      const jevScored = engine.play(scored, 'score:choice', () => 0);
      expect(engine.view(jevScored, 'PLAYER').legalActions).not.toContain(
        'score:choice',
      );
      expect(() => engine.play(jevScored, 'score:choice', () => 0)).toThrow();
    });

    it('finishes after three turns per side and compares scores', () => {
      const engine = luckEngines['yacht-dice'];
      let state = engine.create(() => 0);
      for (const category of [
        'score:yacht',
        'score:large-straight',
        'score:choice',
        'score:small-straight',
        'score:four-kind',
        'score:full-house',
      ]) {
        state = engine.play(state, category, () => 0);
      }
      expect(state.result).toBe('PLAYER');
      expect(engine.view(state, 'PLAYER').data.rounds).toEqual({
        PLAYER: 3,
        JEV: 3,
      });
      expect(engine.view(state, 'PLAYER').legalActions).toEqual([]);
    });
  });

  describe('dice stop', () => {
    it('cancels only the current turn points on a one', () => {
      const engine = luckEngines['dice-stop'];
      const start = engine.create(() => 0);
      expect(engine.view(start, 'PLAYER').legalActions).toEqual(['roll']);
      expect(() => engine.play(start, 'stop', () => 0)).toThrow();
      const afterFour = engine.play(start, 'roll', () => 0.5);
      expect(engine.view(afterFour, 'PLAYER').data.currentPoints).toBe(4);
      const afterOne = engine.play(afterFour, 'roll', () => 0);
      expect(afterOne.turn).toBe('JEV');
      expect(engine.view(afterOne, 'PLAYER').data).toMatchObject({
        currentPoints: 0,
        rounds: { PLAYER: 1, JEV: 0 },
        totals: { PLAYER: 0, JEV: 0 },
        lastRoll: { side: 'PLAYER', value: 1 },
      });
      expect(engine.view(afterOne, 'PLAYER').legalActions).toEqual([]);
    });

    it('banks points automatically on the fifth roll', () => {
      const engine = luckEngines['dice-stop'];
      let state = engine.create(() => 0);
      for (let roll = 0; roll < 5; roll += 1) {
        state = engine.play(state, 'roll', () => 0.5);
      }
      expect(engine.view(state, 'PLAYER').data).toMatchObject({
        rounds: { PLAYER: 1, JEV: 0 },
        totals: { PLAYER: 20, JEV: 0 },
        currentPoints: 0,
        rollsUsed: 0,
      });
    });
  });

  describe('bomb dodge', () => {
    it('keeps the bomb secret, rejects repeat picks, and ends on the bomb', () => {
      const engine = luckEngines['bomb-dodge'];
      const start = engine.create(() => 0);
      expect(engine.view(start, 'PLAYER').data).toEqual({
        opened: [],
        bombPosition: null,
      });
      const safe = engine.play(start, 'pick:1', () => 0);
      expect(engine.view(safe, 'JEV').data.bombPosition).toBeNull();
      expect(() => engine.play(safe, 'pick:1', () => 0)).toThrow();
      const ended = engine.play(safe, 'pick:0', () => 0);
      expect(ended.result).toBe('PLAYER');
      expect(engine.view(ended, 'PLAYER').data.bombPosition).toBe(0);
      expect(engine.view(ended, 'PLAYER').legalActions).toEqual([]);
    });
  });

  describe('blind card', () => {
    it('keeps card values secret until both sides choose', () => {
      const engine = luckEngines['blind-card'];
      const start = engine.create(() => 0);
      expect(engine.view(start, 'PLAYER').data).not.toHaveProperty('cards');
      expect(engine.view(start, 'PLAYER').data.revealed).toBeNull();
      const playerChosen = engine.play(start, 'pick:0', () => 0);
      expect(engine.view(playerChosen, 'PLAYER').legalActions).toEqual([]);
      expect(engine.view(playerChosen, 'JEV').data).toMatchObject({
        chosenPositions: { PLAYER: null, JEV: null },
        revealed: null,
      });
      expect(() => engine.play(playerChosen, 'pick:0', () => 0)).toThrow();
      const ended = engine.play(playerChosen, 'pick:1', () => 0);
      expect(ended.result).toBe('JEV');
      expect(engine.view(ended, 'PLAYER').data).toMatchObject({
        chosenPositions: { PLAYER: 0, JEV: 1 },
        revealed: { PLAYER: 2, JEV: 3 },
      });
      expect(engine.view(ended, 'PLAYER').legalActions).toEqual([]);
    });
  });
});
