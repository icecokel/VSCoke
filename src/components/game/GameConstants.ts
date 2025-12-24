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
    0x003f5c, // 다크 블루
    0x2f4b7c, // 딥 퍼플 블루
    0x665191, // 바이올렛
    0xa05195, // 플럼
    0xd45087, // 딥 핑크
    0xf95d6a, // 코랄
    0xff7c43, // 오렌지
    0xffa600, // 엠버
    0x488fb1, // 스틸 블루
    0x82c09a, // 세이지 그린
  ],
  // 컬럼 수에 따른 사용 색상 수 정의
  COLOR_COUNT_BY_COLS: {
    3: 5,
    4: 6,
    5: 7,
    6: 8,
    7: 9,
  } as Record<number, number>,

  // 레이아웃 설정
  LAYOUT: {
    SIDE_MARGIN: 10, // 양쪽 여백 합계 (픽셀 단위)
    BLOCK_SPACING: 8, // 블록 간 간격 (픽셀 단위)
    COLUMN_WIDTH_RATIO: 1.0, // 컬럼 너비 비율 (1.0 = 표준)
  },
};
