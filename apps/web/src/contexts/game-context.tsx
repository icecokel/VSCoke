"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
  type RefObject,
} from "react";
import type { SkyDropState } from "@/components/game/sky-drop-engine";

interface GameContextValue {
  isGamePlaying: boolean;
  setGamePlaying: (playing: boolean) => void;
  skyDropSession: RefObject<SkyDropState | null>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider = ({ children }: GameProviderProps) => {
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const skyDropSession = useRef<SkyDropState | null>(null);

  const setGamePlaying = useCallback((playing: boolean) => {
    setIsGamePlaying(playing);
  }, []);

  const value = useMemo(
    () => ({
      isGamePlaying,
      setGamePlaying,
      skyDropSession,
    }),
    [isGamePlaying, setGamePlaying],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
