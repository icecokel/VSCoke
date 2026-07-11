import { startGamePage, type GamePageHandle } from "./game/gamePageStartup";
import type { PokeLoungeGameResult } from "./game/createPokeLoungeGame";
import type { GameViewportDisplaySize } from "./game/gameViewport";

export async function startGamePageFromDocument(
  documentRef: Document = document,
  location: URL = new URL(window.location.href),
  options: {
    idToken?: string;
    onGameResult?: (result: PokeLoungeGameResult) => void;
    viewportSize?: GameViewportDisplaySize;
  } = {},
): Promise<GamePageHandle> {
  const mount = documentRef.querySelector<HTMLElement>("#game-root");

  if (!mount) {
    throw new Error("Missing #game-root mount element");
  }

  return startGamePage(mount, location, {
    idToken: options.idToken,
    onGameResult: options.onGameResult,
    viewportSize: options.viewportSize,
  });
}
