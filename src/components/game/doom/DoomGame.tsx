"use client";

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import { Player, Enemy, RayHit } from "./types/doom-types";
import { LEVEL_1, PLAYER_START } from "./engine/doom-map";
import { castAllRays, SCREEN_WIDTH } from "./engine/raycaster";
import { updatePlayer } from "./engine/player-controller";
import { updateEnemies, spawnEnemies, getAttackingEnemies } from "./engine/enemy-ai";
import { fireWeapon } from "./engine/weapon-system";

import { useDoomInput } from "./hooks/use-doom-input";
import { CanvasGame } from "./ui/CanvasGame";
import { MobileControls } from "./ui/MobileControls";
import { DoomHUD } from "./ui/DoomHUD";

interface DoomGameProps {
  isPlaying: boolean;
  onReady: () => void;
  onGoToReady: () => void;
  onRestart: () => void;
}

const ENEMY_ATTACK_DAMAGE = 10;
const ENEMY_ATTACK_COOLDOWN = 1000;

/**
 * 초기 플레이어 상태 생성
 */
const createInitialPlayer = (): Player => ({
  position: { ...PLAYER_START },
  direction: { x: 1, y: 0 },
  plane: { x: 0, y: 0.66 },
  health: 100,
  ammo: 50,
});

/**
 * DOOM 메인 게임 컴포넌트 (Canvas 기반)
 */
export const DoomGame = ({ isPlaying, onReady }: DoomGameProps) => {
  const isMobile = useIsMobile();
  const { input, setTouchInput } = useDoomInput();

  const [player, setPlayer] = useState<Player>(createInitialPlayer);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [rays, setRays] = useState<RayHit[]>([]);
  const [isFiring, setIsFiring] = useState(false);

  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const playerRef = useRef<Player>(player);
  const enemiesRef = useRef<Enemy[]>(enemies);
  const lastFireRef = useRef<number>(0);
  const lastEnemyAttackRef = useRef<number>(0);
  const wasFirePressedRef = useRef<boolean>(false);

  // refs 동기화
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  // 게임 루프
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = (currentTime: number) => {
      const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 16;
      lastTimeRef.current = currentTime;

      let currentPlayer = playerRef.current;
      let currentEnemies = enemiesRef.current;

      // 1. 플레이어 이동 업데이트
      currentPlayer = updatePlayer(currentPlayer, input, LEVEL_1, deltaTime);

      // 2. 적 AI 업데이트
      currentEnemies = updateEnemies(currentEnemies, currentPlayer, LEVEL_1, deltaTime);

      // 3. 발사 처리
      if (input.fire && !wasFirePressedRef.current) {
        if (currentTime - lastFireRef.current > 500 && currentPlayer.ammo > 0) {
          const result = fireWeapon(currentPlayer, currentEnemies, currentTime);
          currentPlayer = result.player;
          currentEnemies = result.enemies;
          lastFireRef.current = currentTime;

          setIsFiring(true);
          setTimeout(() => setIsFiring(false), 100);
        }
      }
      wasFirePressedRef.current = input.fire;

      // 4. 적 공격 처리
      const attackingEnemies = getAttackingEnemies(currentEnemies, currentPlayer);
      if (
        attackingEnemies.length > 0 &&
        currentTime - lastEnemyAttackRef.current > ENEMY_ATTACK_COOLDOWN
      ) {
        currentPlayer = {
          ...currentPlayer,
          health: Math.max(0, currentPlayer.health - ENEMY_ATTACK_DAMAGE * attackingEnemies.length),
        };
        lastEnemyAttackRef.current = currentTime;
      }

      // 상태 업데이트
      playerRef.current = currentPlayer;
      enemiesRef.current = currentEnemies;
      setPlayer(currentPlayer);
      setEnemies(currentEnemies);

      // 5. 레이캐스팅
      const newRays = castAllRays(currentPlayer, LEVEL_1);
      setRays(newRays);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, input]);

  // 초기화
  useEffect(() => {
    const initialPlayer = createInitialPlayer();
    const initialEnemies = spawnEnemies();
    const initialRays = castAllRays(initialPlayer, LEVEL_1);

    setPlayer(initialPlayer);
    setEnemies(initialEnemies);
    setRays(initialRays);

    onReady();
  }, [onReady]);

  return (
    <div className="relative size-full bg-black flex items-center justify-center overflow-hidden">
      <CanvasGame
        rays={rays}
        player={player}
        enemies={enemies}
        map={LEVEL_1}
        screenWidth={SCREEN_WIDTH}
        isFiring={isFiring}
      />
      <DoomHUD health={player.health} ammo={player.ammo} />
      {isMobile && <MobileControls onInput={setTouchInput} />}
    </div>
  );
};
