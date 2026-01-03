"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import { Player } from "./types/doom-types";
import { LEVEL_1, PLAYER_START } from "./engine/doom-map";
import { castAllRays } from "./engine/raycaster";
import { renderFrame } from "./engine/ascii-renderer";
import { updatePlayer } from "./engine/player-controller";

import { useDoomInput } from "./hooks/use-doom-input";
import { AsciiCanvas } from "./ui/AsciiCanvas";
import { MobileControls } from "./ui/MobileControls";
import { DoomHUD } from "./ui/DoomHUD";

interface DoomGameProps {
  isPlaying: boolean;
  onReady: () => void;
  onGoToReady: () => void;
  onRestart: () => void;
}

/**
 * 초기 플레이어 상태 생성
 */
const createInitialPlayer = (): Player => ({
  position: { ...PLAYER_START },
  direction: { x: 1, y: 0 }, // 동쪽을 바라봄
  plane: { x: 0, y: 0.66 }, // FOV ~66도
  health: 100,
  ammo: 50,
});

/**
 * ASCII DOOM 메인 게임 컴포넌트
 */
export const DoomGame = ({ isPlaying, onReady }: DoomGameProps) => {
  const isMobile = useIsMobile();
  const { input, setTouchInput } = useDoomInput();

  const [asciiLines, setAsciiLines] = useState<string[]>([]);
  const [player, setPlayer] = useState<Player>(createInitialPlayer);

  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const playerRef = useRef<Player>(player);

  // playerRef 동기화
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // 게임 루프
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = (currentTime: number) => {
      const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 16;
      lastTimeRef.current = currentTime;

      // 플레이어 업데이트
      const newPlayer = updatePlayer(playerRef.current, input, LEVEL_1, deltaTime);
      playerRef.current = newPlayer;
      setPlayer(newPlayer);

      // 레이캐스팅 및 렌더링
      const rays = castAllRays(newPlayer, LEVEL_1);
      const lines = renderFrame(rays);
      setAsciiLines(lines);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, input]);

  // 초기화: 준비 완료 콜백
  useEffect(() => {
    // 초기 프레임 렌더링
    const initialPlayer = createInitialPlayer();
    const rays = castAllRays(initialPlayer, LEVEL_1);
    const lines = renderFrame(rays);
    setAsciiLines(lines);
    setPlayer(initialPlayer);

    onReady();
  }, [onReady]);

  return (
    <div className="relative size-full bg-black flex items-center justify-center overflow-hidden">
      <AsciiCanvas lines={asciiLines} />
      <DoomHUD health={player.health} ammo={player.ammo} />
      {isMobile && <MobileControls onInput={setTouchInput} />}
    </div>
  );
};
