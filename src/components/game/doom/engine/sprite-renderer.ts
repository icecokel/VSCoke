import { Enemy, Player, Vector2D } from "../types/doom-types";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "./raycaster";

/**
 * 적을 ASCII 스프라이트로 렌더링
 * 거리에 따른 크기 조절 + 벽 뒤에 있으면 가리기
 */

// 적 ASCII 스프라이트 (상태별)
const ENEMY_SPRITES = {
  idle: [" ┌─┐ ", " │O│ ", "┌┴─┴┐", "│   │", "└┬─┬┘"],
  chase: [" ╔═╗ ", " ║X║ ", "╔╩═╩╗", "║   ║", "╚╦═╦╝"],
  attack: ["╔═══╗", "║ ☠ ║", "╠═══╣", "║   ║", "╚═╦═╝"],
  dead: ["     ", " ═╪═ ", "  │  ", " ─┴─ ", "     "],
};

interface SpriteRenderData {
  enemy: Enemy;
  screenX: number;
  distance: number;
  spriteHeight: number;
  spriteWidth: number;
}

/**
 * 적의 화면 위치 계산
 */
const calculateSpritePosition = (
  enemy: Enemy,
  player: Player,
): { screenX: number; distance: number } | null => {
  // 플레이어 기준 상대 위치
  const dx = enemy.position.x - player.position.x;
  const dy = enemy.position.y - player.position.y;

  // 카메라 변환 (역행렬)
  const invDet = 1.0 / (player.plane.x * player.direction.y - player.direction.x * player.plane.y);

  const transformX = invDet * (player.direction.y * dx - player.direction.x * dy);
  const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy);

  // 카메라 뒤에 있으면 렌더링하지 않음
  if (transformY <= 0) return null;

  // 화면 X 좌표
  const screenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));

  return {
    screenX,
    distance: transformY,
  };
};

/**
 * 적들을 ASCII 프레임에 렌더링
 */
export const renderEnemies = (
  lines: string[],
  enemies: Enemy[],
  player: Player,
  wallDistances: number[],
): string[] => {
  // 복사본 생성
  const newLines = lines.map(line => line.split(""));

  // 렌더링할 적 목록 생성
  const renderData: SpriteRenderData[] = [];

  for (const enemy of enemies) {
    const pos = calculateSpritePosition(enemy, player);
    if (!pos) continue;

    // 거리에 따른 스프라이트 크기
    const spriteHeight = Math.min(SCREEN_HEIGHT, Math.floor(SCREEN_HEIGHT / pos.distance));
    const spriteWidth = Math.min(20, Math.floor(20 / pos.distance));

    renderData.push({
      enemy,
      screenX: pos.screenX,
      distance: pos.distance,
      spriteHeight,
      spriteWidth,
    });
  }

  // 거리순 정렬 (먼 적부터 그림 = 페인터 알고리즘)
  renderData.sort((a, b) => b.distance - a.distance);

  // 각 적 렌더링
  for (const data of renderData) {
    const sprite = ENEMY_SPRITES[data.enemy.state] || ENEMY_SPRITES.idle;

    // 스프라이트 시작 Y 위치 (화면 중앙 기준)
    const startY = Math.floor((SCREEN_HEIGHT - data.spriteHeight) / 2);

    // 각 스프라이트 줄 렌더링
    for (let sy = 0; sy < sprite.length; sy++) {
      // 스프라이트 Y를 화면 Y로 매핑
      const ratio = sy / sprite.length;
      const screenY = Math.floor(startY + ratio * data.spriteHeight);

      if (screenY < 0 || screenY >= SCREEN_HEIGHT) continue;

      // 각 스프라이트 문자 렌더링
      for (let sx = 0; sx < sprite[sy].length; sx++) {
        const char = sprite[sy][sx];
        if (char === " ") continue; // 빈칸은 스킵

        const charRatio = sx / sprite[sy].length - 0.5;
        const screenX = Math.floor(data.screenX + charRatio * data.spriteWidth);

        if (screenX < 0 || screenX >= SCREEN_WIDTH) continue;

        // Z-버퍼 체크: 벽보다 앞에 있을 때만 그리기
        if (data.distance < wallDistances[screenX]) {
          newLines[screenY][screenX] = char;
        }
      }
    }
  }

  return newLines.map(line => line.join(""));
};
