import { startGamePage, type GamePageHandle } from "./game/gamePageStartup";
import type { PokeLoungeGameResult } from "./game/createPokeLoungeGame";

export async function startGamePageFromDocument(
  documentRef: Document = document,
  location: URL = new URL(window.location.href),
  options: {
    onGameResult?: (result: PokeLoungeGameResult) => void;
  } = {},
): Promise<GamePageHandle> {
  const mount = documentRef.querySelector<HTMLElement>("#game-root");

  if (!mount) {
    throw new Error("Missing #game-root mount element");
  }

  return startGamePage(mount, location, {
    onGameResult: options.onGameResult,
  });
}
