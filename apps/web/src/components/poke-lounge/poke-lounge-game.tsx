"use client";

import { useEffect } from "react";
import { useGame } from "@/contexts/game-context";
import styles from "./poke-lounge.module.css";

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_GAME__?: { destroy: (removeCanvas?: boolean) => void };
  __POKE_LOUNGE_E2E__?: unknown;
};

export function PokeLoungeGame() {
  const { setGamePlaying } = useGame();

  useEffect(() => {
    let cancelled = false;
    setGamePlaying(true);

    void import("./runtime/game-page").then(({ startGamePageFromDocument }) => {
      if (!cancelled) {
        void startGamePageFromDocument(document, new URL(window.location.href));
      }
    });

    return () => {
      cancelled = true;
      setGamePlaying(false);

      const pokeWindow = window as PokeLoungeWindow;
      pokeWindow.__POKE_LOUNGE_GAME__?.destroy(true);
      delete pokeWindow.__POKE_LOUNGE_GAME__;
      delete pokeWindow.__POKE_LOUNGE_E2E__;
      delete document.documentElement.dataset.pokeLoungeE2eBattle;
      document.body.classList.remove("is-game-fullscreen-fallback-active");
      document.querySelector<HTMLElement>("#game-root")?.replaceChildren();
    };
  }, [setGamePlaying]);

  return (
    <main className={`${styles.page} phaser-game-page`} data-testid="poke-lounge-page">
      <div id="game-root" data-testid="poke-lounge-game-root" />
    </main>
  );
}
