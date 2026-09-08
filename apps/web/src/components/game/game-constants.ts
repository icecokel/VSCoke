export const GameConstants = {
  // Game Balance (Standardization)
  MAX_STACK_HEIGHT: 12, // Max rows allowed before game over (Fairness for all screens)

  // 난이도 및 경고 설정
  INITIAL_SPAWN_INTERVAL: 3000,
  MIN_SPAWN_INTERVAL: 500,
  DIFFICULTY_RAMP_RATE: 100, // 100ms씩 간격 감소
  DIFFICULTY_RAMP_PERIOD: 10000, // 매 10초마다
  WARNING_THRESHOLD_ROWS: 2, // 데드라인으로부터 몇 줄 남았을 때 경고할지 설정
  // 게임 블록도 프로젝트에 정의된 색상만 사용한다. 무늬로도 구분한다.
  BLOCK_PALETTE: [
    "var(--color-coral-400)",
    "var(--color-yellow-100)",
    "var(--color-yellow-500)",
    "var(--color-green-300)",
    "var(--color-blue-100)",
    "var(--color-blue-300)",
    "var(--color-beige-400)",
    "var(--color-red-400)",
  ],
  BLOCK_SYMBOLS: ["●", "◆", "▲", "■", "✦", "✚", "♥", "✳"],

  // 점수 시스템 설정
  SCORE: {
    BASE_POINTS: 100, // 기본 매칭 점수
    COMBO_WINDOW: 3000, // 콤보 유지 시간 (ms)
    COMBO_MULTIPLIERS: [1.0, 1.5, 2.0, 2.5], // 콤보별 배율 (1연속, 2연속, 3연속, 4연속+)
    TIME_THRESHOLDS: [0, 30000, 60000, 90000], // 시간 구간 (ms)
    TIME_MULTIPLIERS: [1.0, 1.2, 1.5, 1.8], // 시간별 배율
    DANGER_BONUS: 50, // 위기 탈출 보너스 점수
  },
};
