import * as Phaser from "phaser";
import { playPokeLoungeBgm, stopPokeLoungeBgm } from "../audio/poke-lounge-audio";
import { GAME_VIEWPORT_SIZE } from "../gameViewport";
import {
  createLocalPreviewRoom,
  type MultiplayerRoom,
  type PlayerFacing,
  type PlayerSnapshot,
  type RoomEvent,
  type RoomMessage,
  type RoomUnsubscribe,
} from "../network/localPreviewRoom";
import { FIELD_MAP } from "../world/fieldMap";
import { WILD_ENCOUNTER_TABLES_JSON_ASSET } from "../world/wildEncounterTables";
import { getDefaultGameStateStore } from "../state/defaultGameStateStore";
import {
  type GameStateStore,
  type LocalPlayerState,
  type PlayerPokemon,
  type RemotePlayerState,
} from "../state/gameStateStore";
import type { TournamentMatch } from "../tournament/tournamentState";
import type { TournamentSession } from "../tournament/tournamentSession";
import { type DiceGambleNumber, type DiceGamblePrediction } from "../gamble/diceGamble";
import { createGameTextStyle } from "../ui/gameTextStyle";
import { DEFAULT_PREPARATION_DURATION_MS } from "../round/roundState";
import { isVirtualGamepadPressed } from "../input/virtualGamepad";
import { createWorldSceneHud, type WorldSceneHudController } from "./world-scene-hud";
import {
  createWorldSceneInteractions,
  type WorldSceneInteractionsController,
} from "./world-scene-interactions";
import {
  createWorldSceneTournament,
  isWorldTournamentBattleResult,
  type WorldSceneTournamentController,
  type WorldTournamentBattleResult,
} from "./world-scene-tournament";
import {
  createWorldSceneEncounters,
  type WildBattleStartInput,
  type WorldSceneEncounterController,
} from "./world-scene-encounters";
import {
  createCompetitiveBattleLaunchCache,
  type CompetitiveBattleLaunchKey,
} from "./competitive-battle-launch";

export { formatPokeDollars, formatRankScoreHud } from "./world-scene-hud";
export {
  readWildEncounterRateOverride,
  WILD_ENCOUNTER_RATE_QUERY_PARAM,
} from "./world-scene-encounters";
export type { WorldTournamentBattleResult } from "./world-scene-tournament";

const PLAYER_SPEED = 104;
const PLAYER_SIZE = FIELD_MAP.player.displaySize;
const PLAYER_HITBOX = FIELD_MAP.player.hitbox;
export const ROUND_DURATION_QUERY_PARAM = "roundMs";

type PcBoxFocus = "party" | "box";

type CursorMap = Phaser.Types.Input.Keyboard.CursorKeys & {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

export interface WorldSpawnPosition {
  x: number;
  y: number;
  facing?: PlayerFacing;
}

export interface WorldSceneCreateData {
  spawnPointName?: string;
  spawnPosition?: WorldSpawnPosition;
  tournamentResult?: WorldTournamentBattleResult;
  completedCompetitiveBattle?: CompetitiveBattleLaunchKey;
}

export interface WorldSceneOptions {
  competitiveRoundsEnabled?: boolean;
}

export interface WorldE2eSnapshot {
  player: {
    x: number;
    y: number;
    facing: PlayerFacing;
    displayWidth: number;
    displayHeight: number;
  } | null;
  camera: {
    zoom: number;
  };
  shortcutGuideOpen: boolean;
  encounterLocked: boolean;
  battleIntroPlaying: boolean;
  pokemonStatusPanel: {
    slotIndex: number;
    name: string;
    level: number;
    currentHp: number | null;
    maxHp: number | null;
    status: NonNullable<PlayerPokemon["status"]>;
  } | null;
  pcBox: {
    open: boolean;
    focus: PcBoxFocus;
    partySlotIndex: number;
    boxIndex: number;
    message: string;
    partyCount: number;
    boxCount: number;
  };
}

export interface ResolvedWorldSpawn {
  x: number;
  y: number;
  facing?: PlayerFacing;
}

export function readRoundDurationOverride(url: URL): number | null {
  const rawDuration = url.searchParams.get(ROUND_DURATION_QUERY_PARAM);
  const parsedDuration = rawDuration ? Number(rawDuration) : NaN;

  if (!Number.isFinite(parsedDuration)) {
    return null;
  }

  return Math.max(1_000, Math.trunc(parsedDuration));
}

interface SpawnObject {
  name?: string;
  type?: string;
  x?: number;
  y?: number;
}

export interface ObjectLayerLookup {
  getObjectLayer(layerName: string): { objects: SpawnObject[] } | null;
}

export function resolveWorldSpawn(
  map: ObjectLayerLookup,
  spawnPointName: string,
  spawnPositionOverride?: WorldSpawnPosition,
): ResolvedWorldSpawn {
  if (spawnPositionOverride) {
    return {
      x: spawnPositionOverride.x,
      y: spawnPositionOverride.y,
      facing: spawnPositionOverride.facing,
    };
  }

  const spawn =
    findObject(map, "SpawnPoints", spawnPointName) ?? findObject(map, "Spawns", spawnPointName);
  const spawnPosition = spawn ? getObjectPosition(spawn) : FIELD_MAP.fallbackSpawn;

  return {
    x: spawnPosition.x,
    y: spawnPosition.y,
  };
}

export class WorldScene extends Phaser.Scene {
  private cursors!: CursorMap;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;
  private aboveLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private player!: Phaser.Physics.Arcade.Sprite;
  private staticNpcs: Phaser.Physics.Arcade.StaticGroup | null = null;
  private remotePlayers = new Map<string, Phaser.Physics.Arcade.Sprite>();
  private remoteLabels = new Map<string, Phaser.GameObjects.Text>();
  private remotePlayerSnapshots = new Map<string, PlayerSnapshot>();
  private unsubscribers: RoomUnsubscribe[] = [];
  private roomConnected = false;
  private pendingRoomMessages: Array<{ type: RoomMessage; payload: RoomEvent[RoomMessage] }> = [];
  private lastLocalSnapshotSyncKey = "";
  private shutdownComplete = false;
  private hud!: WorldSceneHudController;
  private tournament: WorldSceneTournamentController | null = null;
  private facing: PlayerFacing = "front";
  private lastSentAt = 0;
  private lastSent: { x: number; y: number; facing: PlayerFacing } = {
    x: 0,
    y: 0,
    facing: "front",
  };
  private readonly encounters: WorldSceneEncounterController;
  private readonly interactions: WorldSceneInteractionsController;
  private readonly competitiveRoundsEnabled: boolean;
  private readonly competitiveBattleLaunchCache = createCompetitiveBattleLaunchCache();
  private preserveRoomForBattle = false;

  constructor(
    private readonly gameStateStore: GameStateStore = getDefaultGameStateStore(),
    private readonly room: MultiplayerRoom = createLocalPreviewRoom(),
    options: WorldSceneOptions = {},
  ) {
    super("world");
    this.competitiveRoundsEnabled = options.competitiveRoundsEnabled ?? true;
    this.encounters = createWorldSceneEncounters({
      gameStateStore: this.gameStateStore,
      getPlayerPosition: () =>
        this.player
          ? {
              x: this.player.x,
              y: this.player.y,
            }
          : null,
      getPlayerFacing: () => this.facing,
      stopPlayer: () => this.player?.setVelocity(0, 0),
      getLocationUrl: () => new URL(window.location.href),
      getEncounterTableData: () => this.cache.json.get(WILD_ENCOUNTER_TABLES_JSON_ASSET[0]),
      getViewportSize: () => this.getViewportSize(),
      createRectangle: (...args) => this.add.rectangle(...args),
      shakeCamera: (duration, intensity) => this.cameras.main.shake(duration, intensity),
      addTween: config => {
        this.tweens.add(config);
      },
      delay: (ms, onComplete) => {
        this.time.delayedCall(ms, onComplete);
      },
      startBattle: data => this.scene.start("battle", data),
    });
    this.interactions = createWorldSceneInteractions({
      gameStateStore: this.gameStateStore,
      getGameObjectFactory: () => this.add,
      getInputPlugin: () => this.input,
      createStaticGroup: () => this.physics.add.staticGroup(),
      registerStaticNpcs: staticNpcs => {
        this.staticNpcs = staticNpcs;
      },
      getPlayerPosition: () =>
        this.player
          ? {
              x: this.player.x,
              y: this.player.y,
            }
          : null,
      ensureCursorKeys: keyboard => {
        this.ensureCursorKeys(keyboard);
        return this.cursors;
      },
      isBattleIntroPlaying: () => this.encounters.isBattleIntroPlaying(),
      renderPartyHud: () => this.hud.render(),
      closePokemonStatusPanel: options => this.hud.closePokemonStatusPanel(options),
      getPartyPokemonBySlotIndex: slotIndex => this.hud.getPartyPokemonBySlotIndex(slotIndex),
      getPokemonStatusPanelSnapshot: () => this.hud?.getPokemonStatusPanelSnapshot() ?? null,
      isPokemonStatusPanelOpen: () => this.hud.isPokemonStatusPanelOpen(),
      getViewportSize: () => this.getViewportSize(),
    });
  }

  create(data: WorldSceneCreateData = {}): void {
    if (data.completedCompetitiveBattle) {
      this.competitiveBattleLaunchCache.complete(
        data.completedCompetitiveBattle.matchId,
        data.completedCompetitiveBattle.assignmentRevision,
      );
    }
    this.shutdownComplete = false;
    this.preserveRoomForBattle = false;
    this.hud = createWorldSceneHud({
      getGameObjectFactory: () => this.add,
      gameStateStore: this.gameStateStore,
      competitiveRoundsEnabled: this.competitiveRoundsEnabled,
      addUnsubscriber: unsubscribe => this.unsubscribers.push(unsubscribe),
      canOpenPokemonStatusPanel: () => this.interactions.canOpenPokemonStatusPanel(),
      getViewportSize: () => this.getViewportSize(),
      isShutdownComplete: () => this.shutdownComplete,
    });
    this.tournament = createWorldSceneTournament({
      gameStateStore: this.gameStateStore,
      isBattleIntroPlaying: () => this.encounters.isBattleIntroPlaying(),
      hasWorldPlayer: () => Boolean(this.player),
      isRoomTournamentHost: () => this.isRoomTournamentHost(),
      getRemotePlayerSnapshots: () => [...this.remotePlayerSnapshots.values()],
      startTrainerBattle: (match, player, opponent) =>
        this.startTournamentBattle(match, player, opponent),
      getRoomHostPlayerId: () => this.getRoomHostPlayerId(),
      sendTournamentStarted: session => this.sendTournamentStartedMessage(session),
      sendTournamentMatchResult: payload =>
        this.sendRoomMessage("TOURNAMENT_MATCH_RESULT", payload),
      sendTournamentCompleted: payload => this.sendRoomMessage("TOURNAMENT_COMPLETED", payload),
      sendRoundScoreUpdates: payloads => {
        for (const payload of payloads) {
          this.sendRoomMessage("ROUND_SCORE_UPDATED", payload);
        }
      },
      createAnnouncement: (text, fontSize) => this.createTournamentAnnouncement(text, fontSize),
    });
    this.registerLifecycleCleanup();
    this.applyReturnedTournamentResult(data);
    if (!this.competitiveRoundsEnabled) {
      this.gameStateStore.resetCompetitiveSession();
    }
    playPokeLoungeBgm("field-day");

    const map = this.make.tilemap({ key: FIELD_MAP.key });
    const tileset = map.addTilesetImage(FIELD_MAP.tilesetName, FIELD_MAP.tilesetKey);

    if (!tileset) {
      throw new Error(`Missing tileset: ${FIELD_MAP.tilesetName}`);
    }

    map.createLayer("Below Player", tileset, 0, 0);
    const worldLayer = map.createLayer("World", tileset, 0, 0);
    if (hasTileLayer(map, "Grass")) {
      map.createLayer("Grass", tileset, 0, 0);
    }
    this.aboveLayer = map.createLayer("Above Player", tileset, 0, 0);

    if (!worldLayer) {
      throw new Error("Missing World tile layer.");
    }

    this.worldLayer = worldLayer;
    this.worldLayer.setCollisionByProperty({ collides: true });
    this.aboveLayer?.setDepth(40);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.createCurrencyHud();
    this.createRankScoreHud();
    if (this.competitiveRoundsEnabled) {
      this.createRoundHud(
        Date.now(),
        readRoundDurationOverride(new URL(window.location.href)) ?? DEFAULT_PREPARATION_DURATION_MS,
      );
    }
    this.createPartyHud();
    this.interactions.createStaticNpcs(map);
    this.createPlayer(map, data.spawnPointName ?? FIELD_MAP.defaultSpawn, data.spawnPosition);
    this.gameStateStore.setSession({
      sessionId: this.room.sessionId,
      roomId: this.room.roomId,
      connectionStatus: "connecting",
    });
    this.bindRoom();
    this.room.connect(this.createLocalPlayerSnapshot());
    this.roomConnected = true;
    this.bindLocalSnapshotSync();
    this.flushPendingRoomMessages();
    this.interactions.showInitialShortcutGuideIfNeeded();
  }

  update(time: number): void {
    if (!this.player) {
      return;
    }

    this.updateRoundClock(Date.now());

    if (this.encounters.isBattleIntroPlaying()) {
      this.player.setVelocity(0, 0);
      return;
    }

    if (this.interactions.handleInput()) {
      this.player.setVelocity(0, 0);
      return;
    }

    const velocity = this.readVelocity();
    this.player.setVelocity(velocity.x, velocity.y);

    if (velocity.x !== 0 || velocity.y !== 0) {
      this.facing = velocity.facing;
      this.player.anims.play(FIELD_MAP.player.walkAnimationKeys[this.facing], true);
      this.maybeSendMovement(time);
      this.encounters.afterMovement();
      return;
    }

    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.player.setFrame(FIELD_MAP.player.frameNames[this.facing]);
    this.maybeSendMovementEnd(time);
  }

  shutdown(): void {
    if (this.shutdownComplete) {
      return;
    }

    this.shutdownComplete = true;
    stopPokeLoungeBgm("field-day");

    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.hud.destroyPartyHud();
    this.interactions.destroy();
    this.hud.destroy();
    this.tournament?.destroy();
    this.tournament = null;
    this.encounters.destroy();
    this.roomConnected = false;
    this.pendingRoomMessages = [];
    this.remotePlayerSnapshots.clear();
    this.lastLocalSnapshotSyncKey = "";
    if (!this.preserveRoomForBattle) {
      this.room.dispose();
      this.gameStateStore.setSession({
        sessionId: null,
        roomId: null,
        connectionStatus: "offline",
      });
    }
  }

  private registerLifecycleCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.shutdown());
  }

  startWildBattleForTest(input: WildBattleStartInput): void {
    this.encounters.startWildBattleForTest(input);
  }

  getE2eSnapshotForTest(): WorldE2eSnapshot {
    const interactionSnapshot = this.interactions.getE2eSnapshot();
    const encounterSnapshot = this.encounters.getE2eSnapshot();

    return {
      player: this.player
        ? {
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            facing: this.facing,
            displayWidth: Math.round(this.player.displayWidth),
            displayHeight: Math.round(this.player.displayHeight),
          }
        : null,
      camera: {
        zoom: Number(this.cameras.main.zoom.toFixed(2)),
      },
      shortcutGuideOpen: interactionSnapshot.shortcutGuideOpen,
      encounterLocked: encounterSnapshot.encounterLocked,
      battleIntroPlaying: encounterSnapshot.battleIntroPlaying,
      pokemonStatusPanel: interactionSnapshot.pokemonStatusPanel,
      pcBox: interactionSnapshot.pcBox,
    };
  }

  initializeEncounterTrackingForTest(position: { x: number; y: number }): void {
    this.encounters.initialize(position);
  }

  createStaticNpcsForTest(map: ObjectLayerLookup): void {
    this.interactions.createStaticNpcs(map);
  }

  createPlayerForTest(
    map: ObjectLayerLookup,
    spawnPointName: string,
    spawnPositionOverride?: WorldSpawnPosition,
  ): void {
    this.createPlayer(map as Phaser.Tilemaps.Tilemap, spawnPointName, spawnPositionOverride);
  }

  createCurrencyHudForTest(): void {
    this.createCurrencyHud();
  }

  createRankScoreHudForTest(): void {
    this.createRankScoreHud();
  }

  createRoundHudForTest(
    nowMs: number,
    preparationDurationMs = DEFAULT_PREPARATION_DURATION_MS,
  ): void {
    this.createRoundHud(nowMs, preparationDurationMs);
  }

  updateRoundClockForTest(nowMs: number): void {
    this.updateRoundClock(nowMs);
  }

  createPartyHudForTest(): void {
    this.createPartyHud();
  }

  handleConfirmInteractionForTest(): void {
    this.interactions.test.handleConfirmInteraction();
  }

  getNurseMessageForTest(): string {
    return this.interactions.test.getNurseMessage();
  }

  handleFieldInteractionInputForTest(): void {
    this.interactions.test.handleFieldInteractionInput();
  }

  private getViewportSize(): { width: number; height: number } {
    return {
      width: this.scale?.width || GAME_VIEWPORT_SIZE.width,
      height: this.scale?.height || GAME_VIEWPORT_SIZE.height,
    };
  }

  openShopForTest(): void {
    this.interactions.test.openShop();
  }

  openPremiumShopForTest(): void {
    this.interactions.test.openPremiumShop();
  }

  closeShopForTest(): void {
    this.interactions.test.closeShop();
  }

  confirmShopSelectionForTest(): void {
    this.interactions.test.confirmShopSelection();
  }

  isShopOpenForTest(): boolean {
    return this.interactions.test.isShopOpen();
  }

  getShopMessageForTest(): string {
    return this.interactions.test.getShopMessage();
  }

  openInventoryForTest(): void {
    this.interactions.test.openInventory();
  }

  closeInventoryForTest(): void {
    this.interactions.test.closeInventory();
  }

  isInventoryOpenForTest(): boolean {
    return this.interactions.test.isInventoryOpen();
  }

  openPcBoxForTest(): void {
    this.interactions.test.openPcBox();
  }

  closePcBoxForTest(): void {
    this.interactions.test.closePcBox();
  }

  movePcBoxSelectionForTest(delta: number): void {
    this.interactions.test.movePcBoxSelection(delta);
  }

  togglePcBoxFocusForTest(): void {
    this.interactions.test.togglePcBoxFocus();
  }

  confirmPcBoxSelectionForTest(): void {
    this.interactions.test.confirmPcBoxSelection();
  }

  moveInventorySelectionForTest(delta: number): void {
    this.interactions.test.moveInventorySelection(delta);
  }

  confirmInventorySelectionForTest(): void {
    this.interactions.test.confirmInventorySelection();
  }

  showInitialShortcutGuideForTest(): void {
    this.interactions.test.showInitialShortcutGuide();
  }

  openShortcutGuideForTest(): void {
    this.interactions.test.openShortcutGuide();
  }

  closeShortcutGuideForTest(): void {
    this.interactions.test.closeShortcutGuide();
  }

  isShortcutGuideOpenForTest(): boolean {
    return this.interactions.test.isShortcutGuideOpen();
  }

  openDiceGambleForTest(targetNumber?: DiceGambleNumber): void {
    this.interactions.test.openDiceGamble(targetNumber);
  }

  closeDiceGambleForTest(): void {
    this.interactions.test.closeDiceGamble();
  }

  selectDiceGamblePredictionForTest(prediction: DiceGamblePrediction): void {
    this.interactions.test.selectDiceGamblePrediction(prediction);
  }

  confirmDiceGambleSelectionForTest(rolledNumber?: DiceGambleNumber): void {
    this.interactions.test.confirmDiceGambleSelection(rolledNumber);
  }

  isDiceGambleOpenForTest(): boolean {
    return this.interactions.test.isDiceGambleOpen();
  }

  getDiceGambleMessageForTest(): string {
    return this.interactions.test.getDiceGambleMessage();
  }

  private createCurrencyHud(): void {
    this.hud.createCurrencyHud();
  }

  private createRankScoreHud(): void {
    this.hud.createRankScoreHud();
  }

  private createRoundHud(
    nowMs: number,
    preparationDurationMs = DEFAULT_PREPARATION_DURATION_MS,
  ): void {
    this.hud.createRoundHud(nowMs, preparationDurationMs);
    this.tournament?.showResultPresentationIfNeeded();
  }

  private updateRoundClock(nowMs: number): void {
    this.hud.updateRound(nowMs);

    if (!this.competitiveRoundsEnabled) {
      return;
    }

    this.tournament?.update(nowMs);
  }

  private createTournamentAnnouncement(
    text: string,
    fontSize: "14px" | "16px",
  ): Phaser.GameObjects.Text {
    return this.add
      .text(
        Math.round(this.getViewportSize().width / 2),
        56,
        text,
        createGameTextStyle({
          align: "center",
          color: "#fff9dd",
          fontSize,
          stroke: "#263238",
          strokeThickness: 5,
        }),
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1001);
  }

  private startTournamentBattle(
    match: TournamentMatch,
    player: LocalPlayerState,
    opponent: LocalPlayerState,
  ): void {
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const facing = this.facing;

    this.preserveRoomForBattle = true;
    this.player.setVelocity(0, 0);

    const battleData = {
      battleKind: "trainer",
      matchId: match.matchId,
      roundIndex: this.gameStateStore.getState().round.roundIndex,
      matchIndex: match.matchNumber,
      player,
      opponent,
      returnToWorld: {
        mapKey: FIELD_MAP.key,
        x,
        y,
        facing,
      },
    } as const;

    this.encounters.playBattleIntroTransition(() => {
      this.scene.start("battle", battleData);
    });
  }

  private applyReturnedTournamentResult(data: WorldSceneCreateData): void {
    if (isWorldTournamentBattleResult(data.tournamentResult)) {
      this.tournament?.applyReturnedResult(data.tournamentResult);
    }
  }

  private createPartyHud(): void {
    this.hud.createPartyHud();
  }

  private createPlayer(
    map: Phaser.Tilemaps.Tilemap,
    spawnPointName: string,
    spawnPositionOverride?: WorldSpawnPosition,
  ): void {
    const spawnPosition = resolveWorldSpawn(map, spawnPointName, spawnPositionOverride);
    const x = spawnPosition.x;
    const y = spawnPosition.y;

    if (spawnPosition.facing) {
      this.facing = spawnPosition.facing;
    }

    this.player = this.physics.add.sprite(
      x,
      y,
      FIELD_MAP.player.textureKey,
      FIELD_MAP.player.frameNames[this.facing],
    );
    this.player.setDisplaySize(PLAYER_SIZE.width, PLAYER_SIZE.height);
    this.player.setDepth(20);
    this.player.body?.setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height);
    this.player.body?.setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.worldLayer);
    if (this.staticNpcs) {
      this.physics.add.collider(this.player, this.staticNpcs);
    }
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.roundPixels = true;
    this.lastSent = { x: this.player.x, y: this.player.y, facing: this.facing };
    this.encounters.initialize({ x: this.player.x, y: this.player.y });
  }

  private bindRoom(): void {
    this.unsubscribers.push(
      this.room.on("CONNECTION_STATUS", ({ connectionStatus }) => {
        this.gameStateStore.setSession({
          sessionId: this.room.sessionId,
          roomId: this.room.roomId,
          connectionStatus,
        });
      }),
      this.room.on("CURRENT_PLAYERS", ({ players }) => {
        Object.values(players)
          .filter(player => player.sessionId !== this.room.sessionId)
          .forEach(player => this.upsertRemotePlayer(player));
      }),
      this.room.on("PLAYER_JOINED", player => {
        if (player.sessionId !== this.room.sessionId) {
          this.upsertRemotePlayer(player);
        }
      }),
      this.room.on("PLAYER_MOVED", player => {
        if (player.sessionId !== this.room.sessionId) {
          this.upsertRemotePlayer(player);
        }
      }),
      this.room.on("PLAYER_MOVEMENT_ENDED", player => {
        if (player.sessionId !== this.room.sessionId) {
          this.remotePlayerSnapshots.set(player.sessionId, clonePlayerSnapshot(player));
          this.gameStateStore.upsertRemotePlayer(toRemotePlayerState(player));
        }
        const sprite = this.remotePlayers.get(player.sessionId);
        if (sprite) {
          sprite.setVelocity(0, 0);
        }
      }),
      this.room.on("PLAYER_CHANGED_MAP", player => {
        if (player.sessionId !== this.room.sessionId) {
          this.upsertRemotePlayer(player);
        }
      }),
      this.room.on("PLAYER_LEFT", ({ sessionId }) => {
        this.remotePlayers.get(sessionId)?.destroy();
        this.remoteLabels.get(sessionId)?.destroy();
        this.remotePlayers.delete(sessionId);
        this.remoteLabels.delete(sessionId);
        this.remotePlayerSnapshots.delete(sessionId);
        this.gameStateStore.removeRemotePlayer(sessionId);
      }),
      this.room.on("TOURNAMENT_STATE", payload => {
        const applied = this.gameStateStore.applyTournamentSnapshotFromRoom(payload, Date.now());

        if (!applied.ok) {
          return;
        }

        this.tournament?.clearPresentation();
        if (payload.roomStatus === "completed") {
          this.tournament?.showResultPresentationIfNeeded();
        }
      }),
      this.room.on("TOURNAMENT_STARTED", payload => {
        if (!this.canApplyTournamentPayloadFromRoom(payload.hostPlayerId)) {
          return;
        }

        this.gameStateStore.applyTournamentStartedFromRoom(
          {
            ...payload,
            participantIds: payload.participantIds.map(playerId =>
              this.mapRoomParticipantIdForLocalStore(playerId),
            ),
          },
          Date.now(),
        );
        this.tournament?.clearPresentation();
      }),
      this.room.on("COMPETITIVE_ASSIGNMENT", payload => {
        const { projection, ownPlayerId } = payload;

        if (
          !projection.playerIds.includes(ownPlayerId) ||
          !this.competitiveBattleLaunchCache.begin(payload)
        ) {
          return;
        }

        this.preserveRoomForBattle = true;
        this.player.setVelocity(0, 0);
        this.encounters.playBattleIntroTransition(() => {
          const latest = this.competitiveBattleLaunchCache.get(
            projection.matchId,
            projection.assignmentRevision,
          );
          if (!latest) {
            return;
          }
          this.scene.start("battle", {
            battleKind: "authoritative",
            ownPlayerId: latest.ownPlayerId,
            projection: latest.projection,
            returnToWorld: {
              mapKey: FIELD_MAP.key,
              x: Math.round(this.player.x),
              y: Math.round(this.player.y),
              facing: this.facing,
            },
          });
        });
      }),
      this.room.on("COMPETITIVE_STATE", payload => {
        this.competitiveBattleLaunchCache.update(payload);
      }),
      this.room.on("TOURNAMENT_MATCH_RESULT", payload => {
        if (!this.canApplyTournamentPayloadFromRoom(payload.hostPlayerId)) {
          return;
        }

        const state = this.gameStateStore.getState();

        if (
          state.tournament.session?.roundIndex === payload.roundIndex &&
          state.tournament.session.status === "in-progress"
        ) {
          this.gameStateStore.recordTournamentMatchResult(
            payload.matchId,
            this.mapRoomParticipantIdForLocalStore(payload.winnerPlayerId),
            Date.now(),
          );
        }
      }),
      this.room.on("TOURNAMENT_COMPLETED", payload => {
        if (!this.canApplyTournamentPayloadFromRoom(payload.hostPlayerId)) {
          return;
        }

        this.gameStateStore.applyTournamentCompletedFromRoom(
          {
            ...payload,
            championPlayerId: this.mapRoomParticipantIdForLocalStore(payload.championPlayerId),
            standings: payload.standings.map(standing => ({
              ...standing,
              playerId: this.mapRoomParticipantIdForLocalStore(standing.playerId),
            })),
          },
          Date.now(),
        );
        this.tournament?.clearPresentation();
        this.tournament?.showResultPresentationIfNeeded();
      }),
      this.room.on("ROUND_SCORE_UPDATED", payload => {
        if (!this.canApplyTournamentPayloadFromRoom(payload.hostPlayerId)) {
          return;
        }

        this.gameStateStore.applyRoundScoreUpdatedFromRoom({
          ...payload,
          playerId: this.mapRoomParticipantIdForLocalStore(payload.playerId),
        });
      }),
    );
  }

  private bindLocalSnapshotSync(): void {
    this.lastLocalSnapshotSyncKey = this.createLocalSnapshotSyncKey();
    this.unsubscribers.push(
      this.gameStateStore.subscribe(() => {
        if (!this.roomConnected || !this.player) {
          return;
        }

        const nextSnapshotSyncKey = this.createLocalSnapshotSyncKey();

        if (nextSnapshotSyncKey === this.lastLocalSnapshotSyncKey) {
          return;
        }

        this.lastLocalSnapshotSyncKey = nextSnapshotSyncKey;
        this.sendRoomMessage("PLAYER_CHANGED_MAP", this.createLocalPlayerSnapshot());
      }),
    );
  }

  private createLocalSnapshotSyncKey(): string {
    const player = this.gameStateStore.getCurrentLocalPlayer();

    return JSON.stringify({
      playerId: player.playerId,
      displayName: player.displayName,
      activePartySlotIndex: player.activePartySlotIndex,
      party: player.party,
    });
  }

  private upsertRemotePlayer(snapshot: PlayerSnapshot): void {
    this.remotePlayerSnapshots.set(snapshot.sessionId, clonePlayerSnapshot(snapshot));
    this.gameStateStore.upsertRemotePlayer(toRemotePlayerState(snapshot));
    let sprite = this.remotePlayers.get(snapshot.sessionId);
    let label = this.remoteLabels.get(snapshot.sessionId);

    if (!sprite) {
      sprite = this.physics.add.sprite(
        snapshot.x,
        snapshot.y,
        FIELD_MAP.player.textureKey,
        FIELD_MAP.player.frameNames.front,
      );
      sprite.setDisplaySize(PLAYER_SIZE.width, PLAYER_SIZE.height);
      sprite.setDepth(19);
      sprite.setTint(0x9ec5ff);
      sprite.body?.setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height);
      sprite.body?.setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);
      this.physics.add.collider(sprite, this.worldLayer);
      if (this.staticNpcs) {
        this.physics.add.collider(sprite, this.staticNpcs);
      }
      this.remotePlayers.set(snapshot.sessionId, sprite);
    }

    if (!label) {
      label = this.add.text(
        snapshot.x,
        snapshot.y - 22,
        snapshot.sessionId,
        createGameTextStyle({
          color: "#f8fbf0",
          fontSize: "8px",
        }),
      );
      label.setOrigin(0.5, 1);
      label.setDepth(30);
      this.remoteLabels.set(snapshot.sessionId, label);
    }

    sprite.setPosition(snapshot.x, snapshot.y);
    sprite.setFrame(FIELD_MAP.player.frameNames[snapshot.facing]);
    label.setPosition(snapshot.x, snapshot.y - 22);
  }

  private isRoomTournamentHost(): boolean {
    return this.getRoomHostSessionId() === this.room.sessionId;
  }

  private getRoomHostSessionId(): string {
    const sessionIds = [
      this.room.sessionId,
      ...Object.keys(this.gameStateStore.getState().remotePlayers),
      ...this.remotePlayerSnapshots.keys(),
    ];

    return (
      [...new Set(sessionIds)]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))[0] ??
      this.room.sessionId
    );
  }

  private getRoomHostPlayerId(): string | null {
    return this.isRoomTournamentHost() ? this.gameStateStore.getState().currentPlayerId : null;
  }

  private getExpectedRoomHostPlayerId(): string | null {
    const hostSessionId = this.getRoomHostSessionId();

    if (hostSessionId === this.room.sessionId) {
      return this.gameStateStore.getState().currentPlayerId;
    }

    return this.remotePlayerSnapshots.get(hostSessionId)?.playerId?.trim() || hostSessionId;
  }

  private canApplyTournamentPayloadFromRoom(hostPlayerId: string | undefined): boolean {
    const expectedHostPlayerId = this.getExpectedRoomHostPlayerId();

    return Boolean(hostPlayerId && expectedHostPlayerId && hostPlayerId === expectedHostPlayerId);
  }

  private mapRoomParticipantIdForLocalStore(playerId: string): string {
    if (playerId === this.room.sessionId) {
      return this.gameStateStore.getState().currentPlayerId;
    }

    const localPlayersById = this.gameStateStore.getState().playersById;
    const collidingRemoteSnapshot = [...this.remotePlayerSnapshots.values()].find(snapshot => {
      const snapshotPlayerId = snapshot.playerId?.trim() || snapshot.sessionId;

      return snapshotPlayerId === playerId && Object.hasOwn(localPlayersById, playerId);
    });

    return collidingRemoteSnapshot?.sessionId ?? playerId;
  }

  private sendTournamentStartedMessage(session: TournamentSession): void {
    const hostPlayerId = this.getRoomHostPlayerId();

    if (!hostPlayerId) {
      return;
    }

    this.sendRoomMessage("TOURNAMENT_STARTED", {
      roundIndex: session.roundIndex,
      hostPlayerId,
      participantIds: session.tournament.participants.map(participant => participant.playerId),
      matchIds: session.tournament.currentRound?.matches.map(match => match.matchId) ?? [],
    });
  }

  private flushPendingRoomMessages(): void {
    const pendingMessages = this.pendingRoomMessages;
    this.pendingRoomMessages = [];

    for (const { type, payload } of pendingMessages) {
      this.room.send(type, payload);
    }
  }

  private readVelocity(): { x: number; y: number; facing: PlayerFacing } {
    const keyboard = this.input.keyboard;

    if (keyboard) {
      this.ensureCursorKeys(keyboard);
    }

    const left =
      Boolean(this.cursors?.left.isDown || this.cursors?.a.isDown) ||
      isVirtualGamepadPressed("left");
    const right =
      Boolean(this.cursors?.right.isDown || this.cursors?.d.isDown) ||
      isVirtualGamepadPressed("right");
    const up =
      Boolean(this.cursors?.up.isDown || this.cursors?.w.isDown) || isVirtualGamepadPressed("up");
    const down =
      Boolean(this.cursors?.down.isDown || this.cursors?.s.isDown) ||
      isVirtualGamepadPressed("down");
    const vector = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0),
    );

    if (vector.lengthSq() === 0) {
      return { x: 0, y: 0, facing: this.facing };
    }

    vector.normalize().scale(PLAYER_SPEED);

    return {
      x: vector.x,
      y: vector.y,
      facing:
        Math.abs(vector.x) > Math.abs(vector.y)
          ? vector.x > 0
            ? "right"
            : "left"
          : vector.y > 0
            ? "front"
            : "back",
    };
  }

  private ensureCursorKeys(keyboard: Phaser.Input.Keyboard.KeyboardPlugin): void {
    if (this.cursors) {
      return;
    }

    const cursorKeys = keyboard.createCursorKeys();
    this.cursors = {
      ...cursorKeys,
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    } as CursorMap;
  }

  private maybeSendMovement(time: number): void {
    if (time - this.lastSentAt < 90) {
      return;
    }

    if (
      Math.abs(this.player.x - this.lastSent.x) < 1 &&
      Math.abs(this.player.y - this.lastSent.y) < 1 &&
      this.facing === this.lastSent.facing
    ) {
      return;
    }

    this.sendRoomMessage("PLAYER_MOVED", this.createLocalPlayerSnapshot());
    this.persistLocalPlayerPositionIfChanged();
    this.lastSentAt = time;
    this.lastSent = { x: this.player.x, y: this.player.y, facing: this.facing };
  }

  private maybeSendMovementEnd(time: number): void {
    if (time - this.lastSentAt < 90) {
      return;
    }

    this.sendRoomMessage("PLAYER_MOVEMENT_ENDED", this.createLocalPlayerSnapshot());
    this.persistLocalPlayerPositionIfChanged();
    this.lastSentAt = time;
  }

  private persistLocalPlayerPositionIfChanged(): boolean {
    const nextPosition = {
      mapKey: FIELD_MAP.key,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.facing,
    };
    const currentPosition = this.gameStateStore.getCurrentLocalPlayer().position;

    if (!hasPlayerPositionChanged(currentPosition, nextPosition)) {
      return false;
    }

    this.gameStateStore.setLocalPlayerPosition(nextPosition);
    return true;
  }

  private createLocalPlayerSnapshot(): PlayerSnapshot {
    if (!this.player) {
      return createLocalPlayerSnapshot(
        this.room.sessionId,
        this.gameStateStore.getCurrentLocalPlayer(),
        {
          x: 0,
          y: 0,
          facing: this.facing,
        },
      );
    }

    return createLocalPlayerSnapshot(
      this.room.sessionId,
      this.gameStateStore.getCurrentLocalPlayer(),
      {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        facing: this.facing,
      },
    );
  }

  private sendRoomMessage(type: RoomMessage, payload: RoomEvent[RoomMessage]): void {
    if (!this.roomConnected) {
      this.pendingRoomMessages.push({ type, payload });
      return;
    }

    this.room.send(type, payload);
  }
}

export function hasPlayerPositionChanged(
  currentPosition: { mapKey: string; x: number; y: number; facing: PlayerFacing },
  nextPosition: { mapKey: string; x: number; y: number; facing: PlayerFacing },
): boolean {
  return (
    currentPosition.mapKey !== nextPosition.mapKey ||
    currentPosition.x !== nextPosition.x ||
    currentPosition.y !== nextPosition.y ||
    currentPosition.facing !== nextPosition.facing
  );
}

export function createLocalPlayerSnapshot(
  sessionId: string,
  localPlayer: LocalPlayerState,
  position: { x: number; y: number; facing: PlayerFacing },
): PlayerSnapshot {
  const activePokemon = localPlayer.party[localPlayer.activePartySlotIndex]?.pokemon;

  return {
    sessionId,
    playerId: localPlayer.playerId,
    displayName: localPlayer.displayName,
    map: FIELD_MAP.key,
    x: position.x,
    y: position.y,
    facing: position.facing,
    activePartySlotIndex: localPlayer.activePartySlotIndex,
    party: localPlayer.party.map(slot => ({
      slotIndex: slot.slotIndex,
      pokemon: slot.pokemon
        ? {
            ...slot.pokemon,
            moves: slot.pokemon.moves?.map(move => ({ ...move })),
          }
        : null,
    })),
    ...(activePokemon
      ? {
          activePokemon: {
            speciesId: activePokemon.speciesId,
            name: activePokemon.name,
            level: activePokemon.level,
          },
        }
      : {}),
  };
}

export function toRemotePlayerState(snapshot: PlayerSnapshot): RemotePlayerState {
  return {
    sessionId: snapshot.sessionId,
    playerId: snapshot.playerId ?? snapshot.sessionId,
    displayName: snapshot.displayName,
    mapKey: snapshot.map,
    x: snapshot.x,
    y: snapshot.y,
    facing: snapshot.facing,
    activePokemon: snapshot.activePokemon,
  };
}

function clonePlayerSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
  return {
    ...snapshot,
    activePokemon: snapshot.activePokemon ? { ...snapshot.activePokemon } : undefined,
    party: cloneSnapshotParty(snapshot.party),
  };
}

function cloneSnapshotParty(
  party: PlayerSnapshot["party"] | undefined,
): NonNullable<PlayerSnapshot["party"]> {
  return (
    party?.map(slot => ({
      slotIndex: slot.slotIndex,
      pokemon: slot.pokemon
        ? {
            ...slot.pokemon,
            moves: slot.pokemon.moves?.map(move => ({ ...move })),
          }
        : null,
    })) ?? []
  );
}

function findObject(
  map: ObjectLayerLookup,
  layerName: string,
  objectName: string,
): SpawnObject | null {
  return map.getObjectLayer(layerName)?.objects.find(object => object.name === objectName) ?? null;
}

function hasTileLayer(map: Phaser.Tilemaps.Tilemap, layerName: string): boolean {
  return map.layers.some(layer => layer.name === layerName);
}

function getObjectPosition(object: SpawnObject): { x: number; y: number } {
  return {
    x: object.x ?? 0,
    y: object.y ?? 0,
  };
}
