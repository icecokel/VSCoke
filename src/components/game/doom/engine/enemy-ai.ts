import { Enemy, Vector2D, Player } from "../types/doom-types";
import { isWalkable } from "./doom-map";

const ENEMY_SPEED = 0.02;
const CHASE_DISTANCE = 8; // 추격 시작 거리
const ATTACK_DISTANCE = 1.5; // 공격 범위

/**
 * 두 점 사이의 거리 계산
 */
const getDistance = (a: Vector2D, b: Vector2D): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 적이 플레이어를 볼 수 있는지 확인 (간단한 라인 오브 사이트)
 */
const canSeePlayer = (enemy: Enemy, player: Player, map: number[][]): boolean => {
  const dx = player.position.x - enemy.position.x;
  const dy = player.position.y - enemy.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const steps = Math.ceil(dist * 2);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const checkX = enemy.position.x + dx * t;
    const checkY = enemy.position.y + dy * t;

    if (!isWalkable(map, checkX, checkY)) {
      return false;
    }
  }
  return true;
};

/**
 * 단일 적 업데이트
 */
const updateSingleEnemy = (
  enemy: Enemy,
  player: Player,
  map: number[][],
  deltaTime: number,
): Enemy => {
  if (enemy.state === "dead") return enemy;

  const frameMultiplier = deltaTime / 16.67;
  const speed = ENEMY_SPEED * frameMultiplier;

  const distToPlayer = getDistance(enemy.position, player.position);
  const canSee = canSeePlayer(enemy, player, map);

  let newState = enemy.state;
  const newPosition = { ...enemy.position };

  // 상태 전이
  if (canSee && distToPlayer < CHASE_DISTANCE) {
    if (distToPlayer < ATTACK_DISTANCE) {
      newState = "attack";
    } else {
      newState = "chase";
    }
  } else if (enemy.state === "chase" && !canSee) {
    newState = "idle";
  }

  // 추격 이동
  if (newState === "chase") {
    const dx = player.position.x - enemy.position.x;
    const dy = player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const moveX = (dx / dist) * speed;
      const moveY = (dy / dist) * speed;

      const nextX = enemy.position.x + moveX;
      const nextY = enemy.position.y + moveY;

      if (isWalkable(map, nextX, enemy.position.y)) {
        newPosition.x = nextX;
      }
      if (isWalkable(map, enemy.position.x, nextY)) {
        newPosition.y = nextY;
      }
    }
  }

  return {
    ...enemy,
    position: newPosition,
    state: newState,
  };
};

/**
 * 모든 적 업데이트
 */
export const updateEnemies = (
  enemies: Enemy[],
  player: Player,
  map: number[][],
  deltaTime: number,
): Enemy[] => {
  return enemies.map(enemy => updateSingleEnemy(enemy, player, map, deltaTime));
};

/**
 * 적 초기 스폰
 */
export const spawnEnemies = (): Enemy[] => {
  // 플레이어 시작점(2.5, 2.5)에서 동쪽을 바라봄
  // 적을 플레이어 정면 가까운 곳에 배치
  const spawnPoints: Vector2D[] = [
    { x: 8.5, y: 2.5 }, // 정면 직선
    { x: 12.5, y: 3.5 }, // 정면 약간 오른쪽
    { x: 6.5, y: 6.5 }, // 우측 아래
    { x: 10.5, y: 10.5 }, // 중앙 쪽
  ];

  return spawnPoints.map((pos, i) => ({
    id: `enemy_${i}`,
    position: pos,
    health: 100,
    state: "idle" as const,
  }));
};

/**
 * 적 피격 처리
 */
export const damageEnemy = (enemy: Enemy, damage: number): Enemy => {
  const newHealth = enemy.health - damage;
  return {
    ...enemy,
    health: newHealth,
    state: newHealth <= 0 ? "dead" : enemy.state,
  };
};

/**
 * 플레이어가 공격 범위 내 적 확인
 */
export const getAttackingEnemies = (enemies: Enemy[], player: Player): Enemy[] => {
  return enemies.filter(
    e => e.state === "attack" && getDistance(e.position, player.position) < ATTACK_DISTANCE,
  );
};
