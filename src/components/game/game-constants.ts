export interface GameTexts {
  score: string;
  deadline: string;
  start: string;
  gameOver: string;
  finalScore: string;
  restart: string;
  goBack: string;
  time: string;
}

export const GameConstants = {
  MAX_WIDTH: 480,
  ASPECT_RATIO: 9 / 16,
  ASPECT_RATIO_CSS: "9/16",

  // Game Balance (Standardization)
  MAX_STACK_HEIGHT: 12, // Max rows allowed before game over (Fairness for all screens)

  // 난이도 및 경고 설정
  INITIAL_SPAWN_INTERVAL: 3000,
  MIN_SPAWN_INTERVAL: 500,
  DIFFICULTY_RAMP_RATE: 100, // 100ms씩 간격 감소
  DIFFICULTY_RAMP_PERIOD: 10000, // 매 10초마다
  WARNING_THRESHOLD_ROWS: 2, // 데드라인으로부터 몇 줄 남았을 때 경고할지 설정
  BLOCK_PALETTE: [
    0xff6b6b, // Red
    0xff9f43, // Orange
    0xfeca57, // Yellow
    0x1dd1a1, // Green
    0x48dbfb, // Cyan
    0x54a0ff, // Blue
    0x5f27cd, // Purple
    0xff9ff3, // Pink
  ],
  // 컬럼 수에 따른 사용 색상 수 정의
  COLOR_COUNT_BY_COLS: {
    3: 5,
    4: 6,
    5: 7,
  } as Record<number, number>,

  // 레이아웃 설정
  LAYOUT: {
    SIDE_MARGIN: 10, // 양쪽 여백 합계 (픽셀 단위)
    BLOCK_SPACING: 8, // 블록 간 간격 (픽셀 단위)
    COLUMN_WIDTH_RATIO: 1.0, // 컬럼 너비 비율 (1.0 = 표준)
  },

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
