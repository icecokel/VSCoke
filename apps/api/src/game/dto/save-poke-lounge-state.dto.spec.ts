import { validate } from 'class-validator';
import { SavePokeLoungeStateDto } from './save-poke-lounge-state.dto';

const validateDto = (payload: Partial<SavePokeLoungeStateDto>) => {
  const dto = Object.assign(new SavePokeLoungeStateDto(), payload);
  return validate(dto);
};

describe('SavePokeLoungeStateDto', () => {
  it('Poke Lounge 상태 객체와 클라이언트 갱신 시각을 허용해야 함', async () => {
    const errors = await validateDto({
      state: {
        trainer: { x: 12, y: 3 },
        party: ['pikachu', 'eevee'],
      },
      clientUpdatedAt: '2026-07-08T12:00:00.000Z',
    });

    expect(errors).toHaveLength(0);
  });

  it('state가 없으면 거절해야 함', async () => {
    const errors = await validateDto({
      clientUpdatedAt: '2026-07-08T12:00:00.000Z',
    });

    expect(errors[0]?.property).toBe('state');
    expect(errors[0]?.constraints).toHaveProperty('isObject');
  });

  it('state 배열은 거절해야 함', async () => {
    const errors = await validateDto({
      state: ['pikachu'] as unknown as Record<string, unknown>,
    });

    expect(errors[0]?.property).toBe('state');
    expect(errors[0]?.constraints).toHaveProperty('isObject');
  });

  it('clientUpdatedAt이 ISO 날짜 문자열이 아니면 거절해야 함', async () => {
    const errors = await validateDto({
      state: {
        room: 'LOUNGE',
      },
      clientUpdatedAt: 'not-a-date',
    });

    expect(errors[0]?.property).toBe('clientUpdatedAt');
    expect(errors[0]?.constraints).toHaveProperty('isDateString');
  });
});
