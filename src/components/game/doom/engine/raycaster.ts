import { Player, RayHit, TileType } from "../types/doom-types";

export const SCREEN_WIDTH = 120; // ASCII 열 수
export const SCREEN_HEIGHT = 40; // ASCII 행 수

/**
 * 단일 광선 캐스팅 (DDA 알고리즘)
 * @param player - 플레이어 상태
 * @param map - 맵 데이터
 * @param rayIndex - 현재 광선 인덱스
 * @param totalRays - 총 광선 수
 * @returns 광선 충돌 정보
 */
export const castRay = (
  player: Player,
  map: number[][],
  rayIndex: number,
  totalRays: number,
): RayHit => {
  // 카메라 X 좌표 (-1 ~ 1)
  const cameraX = (2 * rayIndex) / totalRays - 1;

  // 광선 방향 계산
  const rayDirX = player.direction.x + player.plane.x * cameraX;
  const rayDirY = player.direction.y + player.plane.y * cameraX;

  // 현재 맵 셀 좌표
  let mapX = Math.floor(player.position.x);
  let mapY = Math.floor(player.position.y);

  // 한 셀을 이동하는 데 필요한 거리
  const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
  const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);

  let stepX: number;
  let stepY: number;
  let sideDistX: number;
  let sideDistY: number;

  // X 방향 스텝 및 초기 사이드 거리 계산
  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (player.position.x - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - player.position.x) * deltaDistX;
  }

  // Y 방향 스텝 및 초기 사이드 거리 계산
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (player.position.y - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - player.position.y) * deltaDistY;
  }

  // DDA 루프: 벽에 닿을 때까지 반복
  let hit = false;
  let side: 0 | 1 = 0;
  let maxIterations = 100; // 무한 루프 방지

  while (!hit && maxIterations > 0) {
    maxIterations--;

    // 다음 셀로 이동
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0; // 동/서 벽
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1; // 남/북 벽
    }

    // 벽 충돌 검사
    if (
      mapY >= 0 &&
      mapY < map.length &&
      mapX >= 0 &&
      mapX < map[0].length &&
      map[mapY][mapX] > 0
    ) {
      hit = true;
    }
  }

  // 수직 거리 계산 (어안 렌즈 효과 보정)
  const perpWallDist =
    side === 0
      ? (mapX - player.position.x + (1 - stepX) / 2) / rayDirX
      : (mapY - player.position.y + (1 - stepY) / 2) / rayDirY;

  return {
    distance: Math.max(perpWallDist, 0.1), // 최소 거리 보장
    wallType: (map[mapY]?.[mapX] ?? TileType.WALL) as TileType,
    side,
    textureX: 0, // ASCII에서는 사용 안 함
  };
};

/**
 * 모든 광선 캐스팅
 * @param player - 플레이어 상태
 * @param map - 맵 데이터
 * @returns 모든 광선의 충돌 정보 배열
 */
export const castAllRays = (player: Player, map: number[][]): RayHit[] => {
  const rays: RayHit[] = [];
  for (let i = 0; i < SCREEN_WIDTH; i++) {
    rays.push(castRay(player, map, i, SCREEN_WIDTH));
  }
  return rays;
};
