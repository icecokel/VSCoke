import { validateGameScoreSubmission } from './game-score-policy';
import { GameType } from './enums/game-type.enum';

describe('농구 랭킹 점수 정책', () => {
  it('30초 경기의 정상 점수와 이론상 최대 점수를 허용한다', () => {
    for (const score of [1, 12, 42]) {
      expect(() =>
        validateGameScoreSubmission({
          score,
          playTime: 30,
          gameType: GameType.ARCADE_BASKETBALL,
        }),
      ).not.toThrow();
    }
  });

  it('범위를 벗어난 점수와 누락되거나 다른 경기 시간을 거부한다', () => {
    for (const score of [0, 43, 1.5]) {
      expect(() =>
        validateGameScoreSubmission({
          score,
          playTime: 30,
          gameType: GameType.ARCADE_BASKETBALL,
        }),
      ).toThrow();
    }
    for (const playTime of [undefined, null, 1, 29, 31]) {
      expect(() =>
        validateGameScoreSubmission({
          score: 12,
          playTime,
          gameType: GameType.ARCADE_BASKETBALL,
        }),
      ).toThrow();
    }
  });
});
