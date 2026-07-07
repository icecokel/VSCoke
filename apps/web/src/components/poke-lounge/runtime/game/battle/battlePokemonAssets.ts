import {
  getRuntimeBattlePokemonAssetManifest,
  type BattlePokemonAssetRecord,
  type BattlePokemonExtractedRangeRecord,
} from "../data/game-data-json";
import type { BattleSpriteRef } from "./battleTypes";

export interface BattlePokemonAssetSet {
  speciesId: number;
  front: BattleSpriteRef;
  back: BattleSpriteRef;
}

export const ROM_EXTRACTED_BATTLE_SPECIES_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 19] as const;

export const ROM_BATTLE_POKEMON_ASSETS: readonly BattlePokemonAssetSet[] = [
  {
    speciesId: 152,
    front: {
      assetKey: "battle-pokemon-152-front",
      path: "/assets/pokemon/front/152.png",
      width: 160,
      height: 80,
    },
    back: {
      assetKey: "battle-pokemon-152-back",
      path: "/assets/pokemon/battle/152/back-default-normal.png",
      width: 160,
      height: 80,
    },
  },
  {
    speciesId: 155,
    front: {
      assetKey: "battle-pokemon-155-front",
      path: "/assets/pokemon/front/155.png",
      width: 160,
      height: 80,
    },
    back: {
      assetKey: "battle-pokemon-155-back",
      path: "/assets/pokemon/battle/155/back-default-normal.png",
      width: 160,
      height: 80,
    },
  },
  {
    speciesId: 158,
    front: {
      assetKey: "battle-pokemon-158-front",
      path: "/assets/pokemon/front/158.png",
      width: 160,
      height: 80,
    },
    back: {
      assetKey: "battle-pokemon-158-back",
      path: "/assets/pokemon/back/158.png",
      width: 160,
      height: 80,
    },
  },
];

const DEFAULT_ROM_EXTRACTED_BATTLE_SPECIES_RANGES: readonly BattlePokemonExtractedRangeRecord[] = [
  createDefaultExtractedRange(1, 10),
  createDefaultExtractedRange(16, 16),
  createDefaultExtractedRange(19, 19),
] as const;

export function getBattlePokemonAssets(speciesId: number): BattlePokemonAssetSet {
  const assetSet = getRegisteredBattlePokemonAssets().find(
    assets => assets.speciesId === speciesId,
  );

  if (assetSet) {
    return assetSet;
  }

  const extractedRange = getExtractedBattlePokemonRanges().find(
    range => speciesId >= range.startSpeciesId && speciesId <= range.endSpeciesId,
  );

  if (extractedRange) {
    return createExtractedBattlePokemonAssets(speciesId, extractedRange);
  }

  throw new Error(`Missing battle Pokemon assets for species ${speciesId}`);
}

export function toBattlePokemonPreloadAssets(): ReadonlyArray<readonly [string, string]> {
  const extractedAssetSets = getExtractedBattlePokemonRanges().flatMap(range =>
    createSpeciesIdRange(range.startSpeciesId, range.endSpeciesId).map(speciesId =>
      createExtractedBattlePokemonAssets(speciesId, range),
    ),
  );
  const assetSets = [...extractedAssetSets, ...getRegisteredBattlePokemonAssets()];

  return assetSets.flatMap(assetSet => [
    [assetSet.front.assetKey, assetSet.front.path] as const,
    [assetSet.back.assetKey, assetSet.back.path] as const,
  ]);
}

function getRegisteredBattlePokemonAssets(): BattlePokemonAssetSet[] {
  const manifest = getRuntimeBattlePokemonAssetManifest({
    fallbackSpecies: Object.fromEntries(
      ROM_BATTLE_POKEMON_ASSETS.map(assetSet => [assetSet.speciesId, toAssetRecord(assetSet)]),
    ),
    fallbackExtractedRanges: [...DEFAULT_ROM_EXTRACTED_BATTLE_SPECIES_RANGES],
  });

  return Object.values(manifest.species).map(createRegisteredBattlePokemonAssets);
}

function getExtractedBattlePokemonRanges(): BattlePokemonExtractedRangeRecord[] {
  return getRuntimeBattlePokemonAssetManifest({
    fallbackSpecies: Object.fromEntries(
      ROM_BATTLE_POKEMON_ASSETS.map(assetSet => [assetSet.speciesId, toAssetRecord(assetSet)]),
    ),
    fallbackExtractedRanges: [...DEFAULT_ROM_EXTRACTED_BATTLE_SPECIES_RANGES],
  }).extractedRanges;
}

function createRegisteredBattlePokemonAssets(
  assetRecord: BattlePokemonAssetRecord,
): BattlePokemonAssetSet {
  return {
    speciesId: assetRecord.speciesId,
    front: {
      assetKey: `battle-pokemon-${assetRecord.speciesId}-front`,
      path: assetRecord.front.path,
      width: assetRecord.front.width,
      height: assetRecord.front.height,
    },
    back: {
      assetKey: `battle-pokemon-${assetRecord.speciesId}-back`,
      path: assetRecord.back.path,
      width: assetRecord.back.width,
      height: assetRecord.back.height,
    },
  };
}

function createExtractedBattlePokemonAssets(
  speciesId: number,
  extractedRange: BattlePokemonExtractedRangeRecord,
): BattlePokemonAssetSet {
  return {
    speciesId,
    front: {
      assetKey: `battle-pokemon-${speciesId}-front`,
      path: extractedRange.front.pathTemplate.replace("{speciesId}", String(speciesId)),
      width: extractedRange.front.width,
      height: extractedRange.front.height,
    },
    back: {
      assetKey: `battle-pokemon-${speciesId}-back`,
      path: extractedRange.back.pathTemplate.replace("{speciesId}", String(speciesId)),
      width: extractedRange.back.width,
      height: extractedRange.back.height,
    },
  };
}

function createSpeciesIdRange(startSpeciesId: number, endSpeciesId: number): number[] {
  return Array.from(
    { length: endSpeciesId - startSpeciesId + 1 },
    (_, index) => startSpeciesId + index,
  );
}

function createDefaultExtractedRange(
  startSpeciesId: number,
  endSpeciesId: number,
): BattlePokemonExtractedRangeRecord {
  return {
    startSpeciesId,
    endSpeciesId,
    front: {
      pathTemplate: "/assets/pokemon/front/{speciesId}.png",
      width: 160,
      height: 80,
    },
    back: {
      pathTemplate: "/assets/pokemon/back/{speciesId}.png",
      width: 160,
      height: 80,
    },
  };
}

function toAssetRecord(assetSet: BattlePokemonAssetSet): BattlePokemonAssetRecord {
  return {
    speciesId: assetSet.speciesId,
    front: {
      path: assetSet.front.path,
      width: assetSet.front.width ?? 160,
      height: assetSet.front.height ?? 80,
    },
    back: {
      path: assetSet.back.path,
      width: assetSet.back.width ?? 160,
      height: assetSet.back.height ?? 80,
    },
  };
}
