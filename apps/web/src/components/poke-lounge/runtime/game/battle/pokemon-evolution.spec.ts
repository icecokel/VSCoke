import assert from "node:assert/strict";
import test from "node:test";
import { normalizePokemonEvolutionTable } from "./pokemon-evolution";

test("진화 대상 이름은 포켓몬 데이터의 한국어 종 이름을 사용한다", () => {
  const evolutionTable = normalizePokemonEvolutionTable({
    version: 1,
    species: {
      1: {
        speciesId: 1,
        name: "이상해씨",
        evolutions: [{ method: 4, parameter: 16, targetSpeciesId: 2 }],
      },
      2: {
        speciesId: 2,
        name: "이상해풀",
        evolutions: [],
      },
    },
  });

  assert.equal(evolutionTable[1]?.[0]?.targetSpeciesName, "이상해풀");
});

test("이름이 없는 구버전 데이터는 종 번호 fallback을 유지한다", () => {
  const evolutionTable = normalizePokemonEvolutionTable({
    version: 1,
    species: {
      1: {
        speciesId: 1,
        evolutions: [{ method: 4, parameter: 16, targetSpeciesId: 2 }],
      },
    },
  });

  assert.equal(evolutionTable[1]?.[0]?.targetSpeciesName, undefined);
});
