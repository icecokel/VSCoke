import { startGamePage } from "./game/gamePageStartup";
import type { PokeLoungeGameResult } from "./game/createPokeLoungeGame";

export async function startGamePageFromDocument(
  documentRef: Document = document,
  location: URL = new URL(window.location.href),
  options: {
    onGameResult?: (result: PokeLoungeGameResult) => void;
  } = {},
): Promise<void> {
  const mount = documentRef.querySelector<HTMLElement>("#game-root");

  if (!mount) {
    throw new Error("Missing #game-root mount element");
  }

  await startGamePage(mount, location, {
    onGameResult: options.onGameResult,
  });
}
