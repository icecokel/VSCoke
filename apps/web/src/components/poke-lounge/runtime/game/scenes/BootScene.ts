import * as Phaser from "phaser";
import { BATTLE_ASSET_MANIFEST_PATH } from "../battle/battleAssets";
import { ROM_BATTLE_PRELOAD_ASSETS } from "../battle/battleDesign";
import { toBattlePokemonPreloadAssets } from "../battle/battlePokemonAssets";
import {
  BATTLE_POKEMON_ASSETS_JSON_PATH,
  LEVEL_UP_MOVE_TABLE_JSON_PATH,
  WILD_BATTLE_MOVE_SETS_JSON_PATH,
} from "../data/game-data-json";
import type { InitialGameScene } from "../gameStartup";
import type { BattleE2eScenario } from "./BattleScene";
import { FIELD_MAP } from "../world/fieldMap";
import { WILD_ENCOUNTER_TABLES_JSON_ASSET } from "../world/wildEncounterTables";

const SAMPLE_BATTLE_POKEMON_PRELOAD_ASSETS = [
  ["battle-player-front", "/assets/pokemon/front/152.png"],
  ["battle-player-back", "/assets/pokemon/battle/152/back-default-normal.png"],
  ["battle-opponent-front", "/assets/pokemon/battle/155/front-default-normal.png"],
  ["battle-opponent-back", "/assets/pokemon/battle/155/back-default-normal.png"],
] as const;

export const ROM_BATTLE_DATA_JSON_ASSETS = [
  ["romPersonalData", "/assets/poke-lounge/extraction/personal-data.json"],
  ["romGrowthTable", "/assets/poke-lounge/extraction/growth-table.json"],
  ["romRefinedBattleRecords", "/assets/poke-lounge/extraction/refined-battle-records.json"],
] as const;

export const WORLD_DATA_JSON_ASSETS = [WILD_ENCOUNTER_TABLES_JSON_ASSET] as const;
const GAME_DATA_JSON_ASSETS = [
  ["levelUpMoveTable", LEVEL_UP_MOVE_TABLE_JSON_PATH],
  ["wildBattleMoveSets", WILD_BATTLE_MOVE_SETS_JSON_PATH],
  ["battlePokemonAssets", BATTLE_POKEMON_ASSETS_JSON_PATH],
] as const;

export class BootScene extends Phaser.Scene {
  constructor(
    private readonly initialScene: InitialGameScene = "world",
    private readonly battleE2eScenario: BattleE2eScenario | null = null,
  ) {
    super("boot");
  }

  preload(): void {
    this.load.json("battleAssetManifest", BATTLE_ASSET_MANIFEST_PATH);
    for (const [key, path] of ROM_BATTLE_DATA_JSON_ASSETS) {
      this.load.json(key, path);
    }
    for (const [key, path] of WORLD_DATA_JSON_ASSETS) {
      this.load.json(key, path);
    }
    for (const [key, path] of GAME_DATA_JSON_ASSETS) {
      this.load.json(key, path);
    }
    for (const [key, path] of [
      ...SAMPLE_BATTLE_POKEMON_PRELOAD_ASSETS,
      ...toBattlePokemonPreloadAssets(),
      ...ROM_BATTLE_PRELOAD_ASSETS,
    ] as const) {
      this.load.image(key, path);
    }
    this.load.image(FIELD_MAP.tilesetKey, FIELD_MAP.tilesetUrl);
    for (const npc of Object.values(FIELD_MAP.npcs)) {
      this.load.image(npc.textureKey, npc.imageUrl);
    }
    this.load.tilemapTiledJSON(FIELD_MAP.key, FIELD_MAP.mapUrl);
    this.load.atlas(
      FIELD_MAP.player.textureKey,
      FIELD_MAP.player.atlasUrl,
      FIELD_MAP.player.atlasJsonUrl,
    );
  }

  create(): void {
    this.createPlayerAnimations();
    if (this.initialScene === "battle") {
      this.scene.start(
        "battle",
        this.battleE2eScenario ? { e2eScenario: this.battleE2eScenario } : undefined,
      );
      return;
    }

    this.scene.start("world", {
      map: FIELD_MAP.key,
      spawnPointName: FIELD_MAP.defaultSpawn,
    });
  }

  private createPlayerAnimations(): void {
    for (const direction of ["left", "right", "front", "back"] as const) {
      this.anims.create({
        key: FIELD_MAP.player.walkAnimationKeys[direction],
        frames: this.anims.generateFrameNames(FIELD_MAP.player.textureKey, {
          prefix: `${FIELD_MAP.player.frameNames[direction]}-walk.`,
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
}
