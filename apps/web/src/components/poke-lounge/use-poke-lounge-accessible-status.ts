"use client";

import { useEffect, useState } from "react";
import { createAccessibleGameSummary } from "./runtime/game/ui/accessible-game-summary";
import { getDefaultGameStateStore } from "./runtime/game/state/defaultGameStateStore";
import {
  POKE_LOUNGE_ACCESSIBLE_STATUS_EVENT,
  type PokeLoungeAccessibleStatusDetail,
} from "./runtime/game/ui/poke-lounge-ui-events";

export function usePokeLoungeAccessibleStatus(): string {
  const [gameSummary, setGameSummary] = useState("게임 상태 준비 중");
  const [sceneStatus, setSceneStatus] = useState("필드 탐색");

  useEffect(() => {
    const store = getDefaultGameStateStore();
    const syncSummary = () => {
      const nextSummary = createAccessibleGameSummary(store.getState());
      setGameSummary(currentSummary =>
        currentSummary === nextSummary ? currentSummary : nextSummary,
      );
    };

    syncSummary();
    return store.subscribe(syncSummary);
  }, []);

  useEffect(() => {
    const handleAccessibleStatus = (event: Event) => {
      const nextStatus = (event as CustomEvent<PokeLoungeAccessibleStatusDetail>).detail.message;
      setSceneStatus(currentStatus => (currentStatus === nextStatus ? currentStatus : nextStatus));
    };

    document.addEventListener(POKE_LOUNGE_ACCESSIBLE_STATUS_EVENT, handleAccessibleStatus);
    return () => {
      document.removeEventListener(POKE_LOUNGE_ACCESSIBLE_STATUS_EVENT, handleAccessibleStatus);
    };
  }, []);

  return `${gameSummary} ${sceneStatus}`;
}
