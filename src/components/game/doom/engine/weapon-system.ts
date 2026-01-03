import { Player, Enemy, Vector2D } from "../types/doom-types";
import { damageEnemy } from "./enemy-ai";

const WEAPON_DAMAGE = 35;
const WEAPON_RANGE = 10;
const FIRE_COOLDOWN = 500; // ms

interface WeaponState {
  lastFireTime: number;
  isFiring: boolean;
}

/**
 * 무기 상태 초기화
 */
export const createWeaponState = (): WeaponState => ({
  lastFireTime: 0,
  isFiring: false,
});

/**
 * 발사 가능 여부 확인
 */
export const canFire = (weapon: WeaponState, currentTime: number): boolean => {
  return currentTime - weapon.lastFireTime >= FIRE_COOLDOWN;
};

/**
 * 발사 처리
 * - 플레이어가 바라보는 방향에서 가장 가까운 적에게 데미지
 */
export const fireWeapon = (
  player: Player,
  enemies: Enemy[],
  currentTime: number,
): { player: Player; enemies: Enemy[]; hit: boolean } => {
  if (player.ammo <= 0) {
    return { player, enemies, hit: false };
  }

  // 탄약 감소
  const newPlayer = {
    ...player,
    ammo: player.ammo - 1,
  };

  // 플레이어 시선 방향으로 적 찾기
  let closestEnemy: Enemy | null = null;
  let closestDist = WEAPON_RANGE;

  for (const enemy of enemies) {
    if (enemy.state === "dead") continue;

    // 적 방향 벡터
    const dx = enemy.position.x - player.position.x;
    const dy = enemy.position.y - player.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > WEAPON_RANGE) continue;

    // 플레이어 시선과 적 방향 사이 각도 체크
    const dirLength = Math.sqrt(player.direction.x ** 2 + player.direction.y ** 2);
    const enemyDirX = dx / dist;
    const enemyDirY = dy / dist;
    const playerDirX = player.direction.x / dirLength;
    const playerDirY = player.direction.y / dirLength;

    // 내적으로 각도 계산 (cos값)
    const dot = enemyDirX * playerDirX + enemyDirY * playerDirY;

    // 약 30도 범위 내에 있으면 맞음 (cos(30°) ≈ 0.866)
    if (dot > 0.8 && dist < closestDist) {
      closestDist = dist;
      closestEnemy = enemy;
    }
  }

  // 적 피격
  if (closestEnemy) {
    const newEnemies = enemies.map(e =>
      e.id === closestEnemy!.id ? damageEnemy(e, WEAPON_DAMAGE) : e,
    );
    return { player: newPlayer, enemies: newEnemies, hit: true };
  }

  return { player: newPlayer, enemies, hit: false };
};

/**
 * 발사 시각 효과 (ASCII)
 * 화면 중앙에 발사 이펙트 추가
 */
export const renderMuzzleFlash = (lines: string[]): string[] => {
  const midY = Math.floor(lines.length / 2);
  const midX = Math.floor(lines[0]?.length / 2) || 60;

  const flash = ["  \\|/  ", " --*-- ", "  /|\\  "];

  const newLines = [...lines];

  for (let i = 0; i < flash.length; i++) {
    const y = midY + i - 1;
    if (y >= 0 && y < newLines.length) {
      const lineChars = newLines[y].split("");
      for (let j = 0; j < flash[i].length; j++) {
        const x = midX + j - 3;
        if (x >= 0 && x < lineChars.length && flash[i][j] !== " ") {
          lineChars[x] = flash[i][j];
        }
      }
      newLines[y] = lineChars.join("");
    }
  }

  return newLines;
};

/**
 * 무기 HUD ASCII
 */
export const getWeaponAscii = (): string[] => {
  return ["      ║║      ", "    ╔═╩╩═╗    ", "   ╔╝    ╚╗   ", "  ╔╝      ╚╗  ", " ═╩════════╩═ "];
};
