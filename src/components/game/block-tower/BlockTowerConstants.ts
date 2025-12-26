export interface BlockTowerTexts {
  score: string;
  height: string;
  gameOver: string;
  finalScore: string;
  restart: string;
  goBack: string;
  tapToDrop: string;
}

// 도형 타입 정의
export type BlockType = "smallSquare" | "mediumSquare" | "largeSquare" | "smallRect" | "largeRect";

// 도형 정보 인터페이스
export interface BlockInfo {
  type: BlockType;
  width: number;
  height: number;
  mass: number; // 무게 (물리 엔진용)
  color: number;
  label: string;
}

export const BlockTowerConstants = {
  MAX_WIDTH: 480,
  ASPECT_RATIO: 9 / 16,
  ASPECT_RATIO_CSS: "9/16",

  // 슈터 설정
  SHOOTER: {
    Y_POSITION: 60, // 슈터 Y 위치
    INITIAL_SPEED: 120, // 초기 속도 (px/sec)
    MAX_SPEED: 350, // 최대 속도
    SPEED_INCREMENT: 20, // 난이도 상승 시 속도 증가량
  },

  // 착지 영역
  LANDING_ZONE: {
    WIDTH_RATIO: 0.5, // 화면 너비의 50%
    HEIGHT: 20, // 착지 영역 두께
  },

  // 도형 정보
  BLOCKS: {
    smallSquare: {
      type: "smallSquare",
      width: 40,
      height: 40,
      mass: 1,
      color: 0x54a0ff, // 파랑
      label: "소형 정사각형",
    },
    mediumSquare: {
      type: "mediumSquare",
      width: 60,
      height: 60,
      mass: 2,
      color: 0x1dd1a1, // 초록
      label: "중형 정사각형",
    },
    largeSquare: {
      type: "largeSquare",
      width: 80,
      height: 80,
      mass: 4,
      color: 0xfeca57, // 노랑
      label: "대형 정사각형",
    },
    smallRect: {
      type: "smallRect",
      width: 80,
      height: 30,
      mass: 1.5,
      color: 0xff6b6b, // 빨강
      label: "소형 직사각형",
    },
    largeRect: {
      type: "largeRect",
      width: 120,
      height: 40,
      mass: 3,
      color: 0xa55eea, // 보라
      label: "대형 직사각형",
    },
  } as Record<BlockType, BlockInfo>,

  // 색상 팔레트 (랜덤 적용)
  COLOR_PALETTE: [
    0xff6b6b, // 빨강
    0xff9f43, // 주황
    0xfeca57, // 노랑
    0x1dd1a1, // 초록
    0x48dbfb, // 하늘
    0x54a0ff, // 파랑
    0x5f27cd, // 보라
    0xff9ff3, // 핑크
    0x00d2d3, // 청록
    0xee5a24, // 진주황
  ],

  // 점수 설정
  SCORE: {
    LAND: 10, // 착지 성공
    PERFECT: 30, // Perfect 착지 (중앙 ±10px)
    HEIGHT_BONUS: 50, // 5층마다 보너스
    PERFECT_THRESHOLD: 10, // Perfect 판정 픽셀 범위
  },

  // 난이도 진행
  DIFFICULTY: {
    RAMP_PERIOD: 15000, // 15초마다 난이도 상승
    INITIAL_BLOCK_TYPES: ["largeSquare", "largeRect"] as BlockType[],
    MID_BLOCK_TYPES: ["mediumSquare", "largeSquare", "largeRect"] as BlockType[],
    HARD_BLOCK_TYPES: ["smallSquare", "mediumSquare", "smallRect", "largeRect"] as BlockType[],
  },

  // 물리 설정
  PHYSICS: {
    GRAVITY_Y: 1, // 중력
    FRICTION: 1.0, // 마찰력 (높을수록 미끄러지지 않음)
    RESTITUTION: 0, // 반발력 (0 = 안 튀김)
  },

  // 게임오버 조건
  GAME_OVER: {
    FALL_THRESHOLD: 50, // 착지 영역 밖으로 떨어진 것으로 판정하는 Y값
  },
};
