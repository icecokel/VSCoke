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
    0xff9999, // 파스텔 레드
    0xffcc99, // 파스텔 오렌지
    0xffff99, // 파스텔 옐로우
    0x99ff99, // 파스텔 그린
    0x99ffff, // 파스텔 시안
    0x99ccff, // 파스텔 블루
    0xcc99ff, // 파스텔 퍼플
    0xff99ff, // 파스텔 마젠타
    0x99ffcc, // 파스텔 민트
    0xccff99, // 파스텔 라임
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
