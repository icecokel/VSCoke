import { Player, InputState } from "../types/doom-types";
import { isWalkable } from "./doom-map";

const MOVE_SPEED = 0.05;
const ROTATE_SPEED = 0.03;

/**
 * 플레이어 상태 업데이트
 * @param player - 현재 플레이어 상태
 * @param input - 입력 상태
 * @param map - 맵 데이터
 * @param deltaTime - 프레임 간 시간 (ms)
 * @returns 새로운 플레이어 상태
 */
export const updatePlayer = (
  player: Player,
  input: InputState,
  map: number[][],
  deltaTime: number,
): Player => {
  const newPlayer = {
    ...player,
    position: { ...player.position },
    direction: { ...player.direction },
    plane: { ...player.plane },
  };

  // 프레임 독립적인 속도 계산
  const frameMultiplier = deltaTime / 16.67; // 60fps 기준
  const moveSpeed = MOVE_SPEED * frameMultiplier;
  const rotSpeed = ROTATE_SPEED * frameMultiplier;

  // 전진
  if (input.forward) {
    const newX = player.position.x + player.direction.x * moveSpeed;
    const newY = player.position.y + player.direction.y * moveSpeed;

    // 충돌 감지: X, Y 각각 체크
    if (isWalkable(map, newX, player.position.y)) {
      newPlayer.position.x = newX;
    }
    if (isWalkable(map, player.position.x, newY)) {
      newPlayer.position.y = newY;
    }
  }

  // 후진
  if (input.backward) {
    const newX = player.position.x - player.direction.x * moveSpeed;
    const newY = player.position.y - player.direction.y * moveSpeed;

    if (isWalkable(map, newX, player.position.y)) {
      newPlayer.position.x = newX;
    }
    if (isWalkable(map, player.position.x, newY)) {
      newPlayer.position.y = newY;
    }
  }

  // 좌회전
  if (input.turnLeft) {
    const oldDirX = newPlayer.direction.x;
    const cosRot = Math.cos(rotSpeed);
    const sinRot = Math.sin(rotSpeed);

    newPlayer.direction.x = oldDirX * cosRot - newPlayer.direction.y * sinRot;
    newPlayer.direction.y = oldDirX * sinRot + newPlayer.direction.y * cosRot;

    const oldPlaneX = newPlayer.plane.x;
    newPlayer.plane.x = oldPlaneX * cosRot - newPlayer.plane.y * sinRot;
    newPlayer.plane.y = oldPlaneX * sinRot + newPlayer.plane.y * cosRot;
  }

  // 우회전
  if (input.turnRight) {
    const oldDirX = newPlayer.direction.x;
    const cosRot = Math.cos(-rotSpeed);
    const sinRot = Math.sin(-rotSpeed);

    newPlayer.direction.x = oldDirX * cosRot - newPlayer.direction.y * sinRot;
    newPlayer.direction.y = oldDirX * sinRot + newPlayer.direction.y * cosRot;

    const oldPlaneX = newPlayer.plane.x;
    newPlayer.plane.x = oldPlaneX * cosRot - newPlayer.plane.y * sinRot;
    newPlayer.plane.y = oldPlaneX * sinRot + newPlayer.plane.y * cosRot;
  }

  return newPlayer;
};
