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

  // Difficulty & Warning
  INITIAL_SPAWN_INTERVAL: 3000,
  MIN_SPAWN_INTERVAL: 500,
  DIFFICULTY_RAMP_RATE: 100, // Decrease interval by 100ms
  DIFFICULTY_RAMP_PERIOD: 10000, // Every 10 seconds
  WARNING_THRESHOLD_ROWS: 2, // Rows from deadline to trigger warning
  BLOCK_PALETTE: [
    0x003f5c, // Dark Blue
    0x2f4b7c, // Deep Purple Blue
    0x665191, // Violet
    0xa05195, // Plum
    0xd45087, // Deep Pink
    0xf95d6a, // Coral
    0xff7c43, // Orange
    0xffa600, // Amber
    0x488fb1, // Steel Blue
    0x82c09a, // Sage Green
  ],
  // Define number of colors used based on column count
  COLOR_COUNT_BY_COLS: {
    3: 5,
    4: 6,
    5: 7,
    6: 8,
    7: 9,
  } as Record<number, number>,
};
