import { RayHit } from "../types/doom-types";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "./raycaster";

// 밝기 순서: 밝음 → 어두움
const ASCII_CHARS = "@#%+=-:. ";

/**
 * 거리와 벽 방향에 따라 ASCII 문자 반환
 * @param distance - 벽까지의 거리
 * @param side - 벽 방향 (0=동/서, 1=남/북)
 * @returns ASCII 문자
 */
const getAsciiChar = (distance: number, side: 0 | 1): string => {
  // 거리에 따른 밝기 계산 (0~1)
  const maxDist = 16;
  const brightness = Math.max(0, 1 - distance / maxDist);

  // 측면에 따른 음영 (동/서 벽은 밝게, 남/북 벽은 어둡게)
  const shadedBrightness = side === 1 ? brightness * 0.7 : brightness;

  // 밝기를 ASCII 문자 인덱스로 변환
  const charIndex = Math.floor((1 - shadedBrightness) * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[Math.min(charIndex, ASCII_CHARS.length - 1)];
};

/**
 * 프레임 렌더링: 레이 정보를 ASCII 문자열 배열로 변환
 * @param rays - 레이캐스팅 결과 배열
 * @returns 각 행의 ASCII 문자열 배열
 */
export const renderFrame = (rays: RayHit[]): string[] => {
  const lines: string[] = [];

  for (let y = 0; y < SCREEN_HEIGHT; y++) {
    let line = "";

    for (let x = 0; x < SCREEN_WIDTH; x++) {
      const ray = rays[x];

      // 벽 높이 계산
      const lineHeight = Math.floor(SCREEN_HEIGHT / ray.distance);
      const drawStart = Math.max(0, Math.floor((SCREEN_HEIGHT - lineHeight) / 2));
      const drawEnd = Math.min(SCREEN_HEIGHT - 1, Math.floor((SCREEN_HEIGHT + lineHeight) / 2));

      if (y < drawStart) {
        // 천장
        line += " ";
      } else if (y > drawEnd) {
        // 바닥: 거리에 따라 음영 표현
        const floorDistance = (y - SCREEN_HEIGHT / 2) / (SCREEN_HEIGHT / 2);
        const floorChar = floorDistance > 0.7 ? "." : floorDistance > 0.4 ? ":" : " ";
        line += floorChar;
      } else {
        // 벽
        line += getAsciiChar(ray.distance, ray.side);
      }
    }

    lines.push(line);
  }

  return lines;
};
