import { validate } from 'class-validator';
import { CreateGameHistoryDto } from './create-game-history.dto';
import { GameType } from '../enums/game-type.enum';

const validateDto = (payload: Partial<CreateGameHistoryDto>) => {
  const dto = Object.assign(new CreateGameHistoryDto(), payload);
  return validate(dto);
};

describe('CreateGameHistoryDto', () => {
  it('유효한 Sky Drop 점수 payload를 허용해야 함', async () => {
    const errors = await validateDto({
      score: 8500,
      playTime: 120,
      gameType: GameType.SKY_DROP,
    });

    expect(errors).toHaveLength(0);
  });

  it('유효한 Poke Lounge 점수 payload를 DTO 레벨에서 허용해야 함', async () => {
    const errors = await validateDto({
      score: 300,
      playTime: 30,
      gameType: GameType.POKE_LOUNGE,
    });

    expect(errors).toHaveLength(0);
  });

  it('정수가 아닌 점수는 거절해야 함', async () => {
    const errors = await validateDto({
      score: 100.5,
      gameType: GameType.SKY_DROP,
    });

    expect(errors[0]?.constraints).toHaveProperty('isInt');
  });

  it('서버 정책보다 큰 점수는 거절해야 함', async () => {
    const errors = await validateDto({
      score: 999999999,
      gameType: GameType.SKY_DROP,
    });

    expect(errors[0]?.constraints).toHaveProperty('max');
  });

  it('비정상 플레이 시간은 거절해야 함', async () => {
    const errors = await validateDto({
      score: 1000,
      playTime: 0,
      gameType: GameType.SKY_DROP,
    });

    expect(errors[0]?.property).toBe('playTime');
    expect(errors[0]?.constraints).toHaveProperty('min');
  });
});
