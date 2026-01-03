// 벡터 및 좌표
export interface Vector2D {
  x: number;
  y: number;
}

// 플레이어 상태
export interface Player {
  position: Vector2D;
  direction: Vector2D;
  plane: Vector2D; // 카메라 평면 (FOV 결정)
  health: number;
  ammo: number;
}

// 맵 타일 타입
export enum TileType {
  EMPTY = 0,
  WALL = 1,
  DOOR = 2,
  ENEMY_SPAWN = 3,
}

// 적 상태
export interface Enemy {
  id: string;
  position: Vector2D;
  health: number;
  state: "idle" | "patrol" | "chase" | "attack" | "dead";
}

// 게임 상태
export interface GameState {
  player: Player;
  enemies: Enemy[];
  map: number[][];
  isRunning: boolean;
  isPaused: boolean;
}

// 레이캐스팅 결과
export interface RayHit {
  distance: number;
  wallType: TileType;
  side: 0 | 1; // 0=NS, 1=EW
  textureX: number;
}

// 입력 상태
export interface InputState {
  forward: boolean;
  backward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fire: boolean;
  use: boolean;
}
