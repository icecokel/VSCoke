import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadRuntimeGameDataJson,
  POKEMON_DATA_JSON_PATH,
  resetRuntimeGameDataJsonStateForTest,
} from "../data/game-data-json";
import { createBattleMoveFromRom } from "./levelUpMoves";
import type { RomRefinedMoveCollection } from "./wildBattleFactory";

const webRoot = fileURLToPath(new URL("../../../../../../", import.meta.url));

test("ROM 한국어 기술명은 코드형 fallback 대신 상대 기술명에 사용한다", async () => {
  const pokemonData = readPublicJson(POKEMON_DATA_JSON_PATH);
  const moveRecords = readPublicJson(
    "/assets/poke-lounge/extraction/refined-battle-records.json",
  ) as RomRefinedMoveCollection;

  await loadRuntimeGameDataJson(createPokemonDataFetcher(pokemonData));

  try {
    assert.equal(createBattleMoveFromRom(78, moveRecords).name, "저리가루");
    assert.equal(createBattleMoveFromRom(200, moveRecords).name, "역린");
  } finally {
    resetRuntimeGameDataJsonStateForTest();
  }
});

function readPublicJson(publicPath: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(webRoot, "public", publicPath.replace(/^\//, "")), "utf8"),
  );
}

const createPokemonDataFetcher =
  (pokemonData: unknown): typeof fetch =>
  async input => {
    const requestPath =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.pathname
          : new URL(input.url).pathname;

    if (requestPath !== POKEMON_DATA_JSON_PATH) {
      return new Response(null, { status: 404 });
    }

    return new Response(JSON.stringify(pokemonData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
