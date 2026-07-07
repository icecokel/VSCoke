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
    front: { assetKey: "battle-pokemon-152-front", path: "/assets/pokemon/front/152.png" },
    back: {
      assetKey: "battle-pokemon-152-back",
      path: "/assets/pokemon/battle/152/back-default-normal.png",
    },
  },
  {
    speciesId: 155,
    front: {
      assetKey: "battle-pokemon-155-front",
      path: "/assets/pokemon/front/155.png",
    },
    back: {
      assetKey: "battle-pokemon-155-back",
      path: "/assets/pokemon/battle/155/back-default-normal.png",
    },
  },
  {
    speciesId: 158,
    front: { assetKey: "battle-pokemon-158-front", path: "/assets/pokemon/front/158.png" },
    back: { assetKey: "battle-pokemon-158-back", path: "/assets/pokemon/back/158.png" },
  },
];

export function getBattlePokemonAssets(speciesId: number): BattlePokemonAssetSet {
  const assetSet = ROM_BATTLE_POKEMON_ASSETS.find(assets => assets.speciesId === speciesId);

  if (assetSet) {
    return assetSet;
  }

  if (isRomExtractedBattleSpeciesId(speciesId)) {
    return createRomExtractedBattlePokemonAssets(speciesId);
  }

  throw new Error(`Missing battle Pokemon assets for species ${speciesId}`);
}

export function toBattlePokemonPreloadAssets(): ReadonlyArray<readonly [string, string]> {
  const assetSets = [
    ...ROM_EXTRACTED_BATTLE_SPECIES_IDS.map(createRomExtractedBattlePokemonAssets),
    ...ROM_BATTLE_POKEMON_ASSETS,
  ];

  return assetSets.flatMap(assetSet => [
    [assetSet.front.assetKey, assetSet.front.path] as const,
    [assetSet.back.assetKey, assetSet.back.path] as const,
  ]);
}

function isRomExtractedBattleSpeciesId(speciesId: number): boolean {
  return (ROM_EXTRACTED_BATTLE_SPECIES_IDS as readonly number[]).includes(speciesId);
}

function createRomExtractedBattlePokemonAssets(speciesId: number): BattlePokemonAssetSet {
  return {
    speciesId,
    front: {
      assetKey: `battle-pokemon-${speciesId}-front`,
      path: `/assets/pokemon/front/${speciesId}.png`,
    },
    back: {
      assetKey: `battle-pokemon-${speciesId}-back`,
      path: `/assets/pokemon/back/${speciesId}.png`,
    },
  };
}
