import * as Phaser from "phaser";
import { playBattleStartSound } from "../battle/battleAudio";
import type { BattleResultReason } from "../battle/battleTypes";
import { GAME_VIEWPORT_SIZE } from "../gameViewport";
import {
  BATTLE_INTRO_STRIPE_COUNT,
  BATTLE_INTRO_TIMING,
  createBattleIntroStripes,
  getBattleIntroDurationMs,
} from "../battle/battleIntro";
import {
  createLocalPreviewRoom,
  type MultiplayerRoom,
  type PlayerFacing,
  type PlayerSnapshot,
  type RoomEvent,
  type RoomMessage,
  type RoomUnsubscribe,
} from "../network/localPreviewRoom";
import { FIELD_MAP, resolveFieldEncounterAreaId } from "../world/fieldMap";
import {
  consumeCompletedTileStep,
  createTileStepTracker,
  type TileStepTracker,
} from "../world/tileSteps";
import {
  createWildEncounterLevelRange,
  rollWildEncounter,
  type WildEncounterCandidate,
  type WildEncounterLevelRange,
  type WildEncounterSlot,
} from "../world/wildEncounters";
import {
  WILD_ENCOUNTER_TABLES_JSON_ASSET,
  selectWildEncounterConfig,
} from "../world/wildEncounterTables";
import { getDefaultGameStateStore } from "../state/defaultGameStateStore";
import {
  calculateOccupiedPartyAverageLevel,
  type GameState,
  type GameStateStore,
  type LocalPlayerState,
  type PlayerCompetitiveStats,
  type RemotePlayerState,
  createDefaultLocalPlayer,
  getShopItemById,
  getUnlockedPremiumShopItemIds,
  getUnlockedShopItemIds,
  PREMIUM_SHOP_ITEM_IDS,
  SHOP_ITEM_IDS,
  type PremiumShopItemId,
  type ShopItem,
  type ShopItemId,
} from "../state/gameStateStore";
import {
  DICE_GAMBLE_PREDICTIONS,
  DICE_GAMBLE_STAKE_POKE_DOLLARS,
  createDiceGambleRound,
  resolveDiceGambleRound,
  type DiceGambleNumber,
  type DiceGamblePrediction,
  type DiceGambleRound,
} from "../gamble/diceGamble";
import {
  createPartyHudSlotViews,
  PARTY_HUD_SLOT_SIZE,
  type PartyHudSlotView,
} from "../ui/partyHud";
import { createGameTextStyle } from "../ui/gameTextStyle";
import { createShortcutGuideRows, createShortcutGuideTitle } from "../ui/shortcutGuide";
import {
  DEFAULT_PREPARATION_DURATION_MS,
  formatRoundTimer,
  getRoundRemainingMs,
} from "../round/roundState";
import type { TournamentMatch, TournamentStanding } from "../tournament/tournamentState";
import {
  getTournamentSessionStandings,
  type TournamentSession,
} from "../tournament/tournamentSession";
import {
  createTournamentResultPanelViewModel,
  formatTournamentResultRow,
} from "../tournament/tournamentResultViewModel";
import {
  createRoundScoreUpdatedAuthorityPayloads,
  createTournamentCompletedAuthorityPayload,
  createTournamentMatchResultAuthorityPayload,
} from "../network/tournamentAuthority";
import { consumeVirtualGamepadPress, isVirtualGamepadPressed } from "../input/virtualGamepad";
import { setShortcutGuideTouchControlsSuppressed } from "../input/mobileTouchControlsVisibility";

const PLAYER_SPEED = 104;
const PLAYER_SIZE = FIELD_MAP.player.displaySize;
const PLAYER_HITBOX = FIELD_MAP.player.hitbox;
const SHOP_PANEL_SIZE = { width: 384, height: 268 } as const;
const INVENTORY_PANEL_SIZE = { width: 560, height: 320 } as const;
const DICE_GAMBLE_PANEL_SIZE = { width: 408, height: 292 } as const;
const SHORTCUT_GUIDE_PANEL_SIZE = { width: 420, height: 248 } as const;
const DICE_GAMBLE_LABELS: Record<DiceGamblePrediction, string> = {
  lower: "낮다",
  equal: "같다",
  higher: "높다",
};
const INVENTORY_CATEGORY_LABELS = ["도구", "볼", "회복", "기타"] as const;
const INVENTORY_ITEM_CATEGORIES: Record<string, (typeof INVENTORY_CATEGORY_LABELS)[number]> = {
  antidote: "도구",
  hyperPotion: "회복",
  pokeball: "볼",
  potion: "회복",
  rareCandy: "도구",
  revive: "회복",
  superPotion: "회복",
  ultraBall: "볼",
};
export const WILD_ENCOUNTER_RATE_QUERY_PARAM = "wildEncounterRate";
export const ROUND_DURATION_QUERY_PARAM = "roundMs";

type ShopKind = "basic" | "premium";
type KnownShopItemId = ShopItemId | PremiumShopItemId;

type CursorMap = Phaser.Types.Input.Keyboard.CursorKeys & {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

interface InteractionKeys {
  enter: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  z: Phaser.Input.Keyboard.Key;
  esc: Phaser.Input.Keyboard.Key;
  backspace: Phaser.Input.Keyboard.Key;
  inventory: Phaser.Input.Keyboard.Key;
  help: Phaser.Input.Keyboard.Key;
}

interface WildBattleStartInput {
  encounter: WildEncounterCandidate;
  x: number;
  y: number;
  facing: PlayerFacing;
}

export interface WorldSpawnPosition {
  x: number;
  y: number;
  facing?: PlayerFacing;
}

export interface WorldSceneCreateData {
  spawnPointName?: string;
  spawnPosition?: WorldSpawnPosition;
  tournamentResult?: WorldTournamentBattleResult;
}

export interface WorldTournamentBattleResult {
  matchId: string;
  winnerPlayerId: string;
  loserPlayerId: string;
  reason: BattleResultReason;
}

export interface WorldE2eSnapshot {
  player: {
    x: number;
    y: number;
    facing: PlayerFacing;
  } | null;
  shortcutGuideOpen: boolean;
  encounterLocked: boolean;
  battleIntroPlaying: boolean;
}

export interface ResolvedWorldSpawn {
  x: number;
  y: number;
  facing?: PlayerFacing;
}

export function readWildEncounterRateOverride(url: URL): number | undefined {
  const rawRate = url.searchParams.get(WILD_ENCOUNTER_RATE_QUERY_PARAM);

  if (rawRate === null) {
    return undefined;
  }

  const parsedRate = Number(rawRate);

  if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 1) {
    return undefined;
  }

  return parsedRate;
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

interface ObjectLayerLookup {
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

function getCenteredPanelOrigin(
  panel: { width: number; height: number },
  screenSize: { width: number; height: number },
): {
  x: number;
  y: number;
} {
  return {
    x: Math.round((screenSize.width - panel.width) / 2),
    y: Math.round((screenSize.height - panel.height) / 2),
  };
}

function clampSelectionIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(itemCount - 1, index));
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
  private currencyHudText: Phaser.GameObjects.Text | null = null;
  private rankScoreHudText: Phaser.GameObjects.Text | null = null;
  private roundHudText: Phaser.GameObjects.Text | null = null;
  private roundAnnouncementText: Phaser.GameObjects.Text | null = null;
  private lastRenderedRoundHudText = "";
  private partyHudObjects: Phaser.GameObjects.GameObject[] = [];
  private partyHudSubscribed = false;
  private facing: PlayerFacing = "front";
  private lastSentAt = 0;
  private lastSent = { x: 0, y: 0 };
  private stepTracker: TileStepTracker | null = null;
  private encounterLocked = false;
  private battleIntroPlaying = false;
  private tournamentBattleStarting = false;
  private wildEncounterRateOverride: number | undefined;
  private interactionKeys: InteractionKeys | null = null;
  private shopkeeperPosition: { x: number; y: number } | null = null;
  private premiumShopkeeperPosition: { x: number; y: number } | null = null;
  private gamehostPosition: { x: number; y: number } | null = null;
  private nursePosition: { x: number; y: number } | null = null;
  private nurseMessage = "";
  private nurseMessageObject: Phaser.GameObjects.Text | null = null;
  private shopOpen = false;
  private activeShopKind: ShopKind = "basic";
  private shopSelectedIndex = 0;
  private shopMessage = "";
  private shopUiObjects: Phaser.GameObjects.GameObject[] = [];
  private inventoryOpen = false;
  private inventorySelectedIndex = 0;
  private inventoryMessage = "";
  private inventoryUiObjects: Phaser.GameObjects.GameObject[] = [];
  private shortcutGuideOpen = false;
  private shortcutGuideUiObjects: Phaser.GameObjects.GameObject[] = [];
  private diceGambleOpen = false;
  private diceGambleRound: DiceGambleRound | null = null;
  private diceGambleSelectedIndex = 0;
  private diceGambleMessage = "";
  private diceGambleUiObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly gameStateStore: GameStateStore = getDefaultGameStateStore(),
    private readonly room: MultiplayerRoom = createLocalPreviewRoom(),
  ) {
    super("world");
  }

  create(data: WorldSceneCreateData = {}): void {
    this.shutdownComplete = false;
    this.registerLifecycleCleanup();
    this.applyReturnedTournamentResult(data);

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
    this.wildEncounterRateOverride = readWildEncounterRateOverride(new URL(window.location.href));

    this.createCurrencyHud();
    this.createRankScoreHud();
    this.createRoundHud(
      Date.now(),
      readRoundDurationOverride(new URL(window.location.href)) ?? DEFAULT_PREPARATION_DURATION_MS,
    );
    this.createPartyHud();
    this.createStaticNpcs(map);
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
    this.showInitialShortcutGuideIfNeeded();
  }

  update(time: number): void {
    if (!this.player) {
      return;
    }

    this.updateRoundClock(Date.now());

    if (this.battleIntroPlaying) {
      this.player.setVelocity(0, 0);
      return;
    }

    if (this.shortcutGuideOpen) {
      this.player.setVelocity(0, 0);
      this.handleShortcutGuideKeyboardInput();
      return;
    }

    if (this.shopOpen) {
      this.player.setVelocity(0, 0);
      this.handleShopKeyboardInput();
      return;
    }

    if (this.inventoryOpen) {
      this.player.setVelocity(0, 0);
      this.handleInventoryKeyboardInput();
      return;
    }

    if (this.diceGambleOpen) {
      this.player.setVelocity(0, 0);
      this.handleDiceGambleKeyboardInput();
      return;
    }

    this.handleFieldInteractionInput();

    if (this.shopOpen || this.diceGambleOpen) {
      this.player.setVelocity(0, 0);
      return;
    }

    const velocity = this.readVelocity();
    this.player.setVelocity(velocity.x, velocity.y);

    if (velocity.x !== 0 || velocity.y !== 0) {
      this.facing = velocity.facing;
      this.player.anims.play(FIELD_MAP.player.walkAnimationKeys[this.facing], true);
      this.maybeSendMovement(time);
      this.checkWildEncounterAfterMovement();
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

    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.partyHudSubscribed = false;
    this.partyHudObjects.forEach(object => object.destroy());
    this.partyHudObjects = [];
    this.closeShop();
    this.closeInventory();
    this.closeShortcutGuide({ markViewed: false });
    this.closeDiceGamble();
    this.nurseMessageObject?.destroy();
    this.nurseMessageObject = null;
    this.nurseMessage = "";
    this.roundHudText?.destroy();
    this.roundAnnouncementText?.destroy();
    this.roundHudText = null;
    this.roundAnnouncementText = null;
    this.lastRenderedRoundHudText = "";
    this.tournamentBattleStarting = false;
    this.roomConnected = false;
    this.pendingRoomMessages = [];
    this.remotePlayerSnapshots.clear();
    this.lastLocalSnapshotSyncKey = "";
    this.room.dispose();
    this.gameStateStore.setSession({
      sessionId: null,
      roomId: null,
      connectionStatus: "offline",
    });
  }

  private registerLifecycleCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.shutdown());
  }

  startWildBattleForTest(input: WildBattleStartInput): void {
    this.startWildBattle(input);
  }

  getE2eSnapshotForTest(): WorldE2eSnapshot {
    return {
      player: this.player
        ? {
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            facing: this.facing,
          }
        : null,
      shortcutGuideOpen: this.shortcutGuideOpen,
      encounterLocked: this.encounterLocked,
      battleIntroPlaying: this.battleIntroPlaying,
    };
  }

  initializeEncounterTrackingForTest(position: { x: number; y: number }): void {
    this.initializeEncounterTracking(position);
  }

  createStaticNpcsForTest(map: ObjectLayerLookup): void {
    this.createStaticNpcs(map);
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
    this.handleConfirmInteraction();
  }

  getNurseMessageForTest(): string {
    return this.nurseMessage;
  }

  handleFieldInteractionInputForTest(): void {
    this.handleFieldInteractionInput();
  }

  private getViewportSize(): { width: number; height: number } {
    return {
      width: this.scale?.width || GAME_VIEWPORT_SIZE.width,
      height: this.scale?.height || GAME_VIEWPORT_SIZE.height,
    };
  }

  openShopForTest(): void {
    this.openShop();
  }

  openPremiumShopForTest(): void {
    this.openShop("premium");
  }

  closeShopForTest(): void {
    this.closeShop();
  }

  confirmShopSelectionForTest(): void {
    this.confirmShopSelection();
  }

  isShopOpenForTest(): boolean {
    return this.shopOpen;
  }

  getShopMessageForTest(): string {
    return this.shopMessage;
  }

  openInventoryForTest(): void {
    this.openInventory();
  }

  closeInventoryForTest(): void {
    this.closeInventory();
  }

  isInventoryOpenForTest(): boolean {
    return this.inventoryOpen;
  }

  moveInventorySelectionForTest(delta: number): void {
    this.moveInventorySelection(delta);
  }

  confirmInventorySelectionForTest(): void {
    this.confirmInventorySelection();
  }

  showInitialShortcutGuideForTest(): void {
    this.showInitialShortcutGuideIfNeeded();
  }

  openShortcutGuideForTest(): void {
    this.openShortcutGuide();
  }

  closeShortcutGuideForTest(): void {
    this.closeShortcutGuide();
  }

  isShortcutGuideOpenForTest(): boolean {
    return this.shortcutGuideOpen;
  }

  openDiceGambleForTest(targetNumber?: DiceGambleNumber): void {
    this.openDiceGamble(targetNumber);
  }

  closeDiceGambleForTest(): void {
    this.closeDiceGamble();
  }

  selectDiceGamblePredictionForTest(prediction: DiceGamblePrediction): void {
    const index = DICE_GAMBLE_PREDICTIONS.indexOf(prediction);

    if (index < 0) {
      return;
    }

    this.diceGambleSelectedIndex = index;
    this.diceGambleMessage = "";
    this.renderDiceGambleUi();
  }

  confirmDiceGambleSelectionForTest(rolledNumber?: DiceGambleNumber): void {
    this.confirmDiceGambleSelection(rolledNumber);
  }

  isDiceGambleOpenForTest(): boolean {
    return this.diceGambleOpen;
  }

  getDiceGambleMessageForTest(): string {
    return this.diceGambleMessage;
  }

  private createCurrencyHud(): void {
    this.currencyHudText = this.add
      .text(
        12,
        10,
        formatPokeDollars(this.gameStateStore.getCurrentLocalPlayer().wallet.pokeDollars),
        createGameTextStyle({
          color: "#f8fbf0",
          fontSize: "14px",
          stroke: "#263238",
          strokeThickness: 4,
        }),
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.unsubscribers.push(
      this.gameStateStore.subscribe(state => {
        const currentPlayer = state.playersById[state.currentPlayerId];

        this.currencyHudText?.setText(formatPokeDollars(currentPlayer?.wallet.pokeDollars ?? 0));
      }),
    );
  }

  private createRankScoreHud(): void {
    this.rankScoreHudText = this.add
      .text(
        this.getViewportSize().width - 12,
        10,
        formatRankScoreHud(this.gameStateStore.getCurrentLocalPlayer().competitive),
        createGameTextStyle({
          align: "right",
          color: "#f8fbf0",
          fontSize: "12px",
          stroke: "#263238",
          strokeThickness: 4,
        }),
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.unsubscribers.push(
      this.gameStateStore.subscribe(state => {
        const currentPlayer = state.playersById[state.currentPlayerId];

        this.rankScoreHudText?.setText(
          formatRankScoreHud(currentPlayer?.competitive ?? { rank: null, score: 0 }),
        );
      }),
    );
  }

  private createRoundHud(
    nowMs: number,
    preparationDurationMs = DEFAULT_PREPARATION_DURATION_MS,
  ): void {
    if (this.gameStateStore.getState().round.phase === "waiting") {
      this.gameStateStore.startPreparationRound(nowMs, preparationDurationMs);
    }

    const hudText = this.formatRoundHudText(nowMs);
    this.roundHudText = this.add
      .text(
        Math.round(this.getViewportSize().width / 2),
        10,
        hudText,
        createGameTextStyle({
          align: "center",
          color: "#f8fbf0",
          fontSize: "12px",
          stroke: "#263238",
          strokeThickness: 4,
        }),
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.lastRenderedRoundHudText = hudText;
    this.showTournamentResultMessageIfNeeded();
  }

  private updateRoundClock(nowMs: number): void {
    this.gameStateStore.advanceRoundClock(nowMs);
    const nextText = this.formatRoundHudText(nowMs);

    if (nextText !== this.lastRenderedRoundHudText) {
      this.roundHudText?.setText(nextText);
      this.lastRenderedRoundHudText = nextText;
    }

    if (this.gameStateStore.getState().round.phase === "tournament") {
      if (this.tryStartTournamentBattle()) {
        return;
      }

      this.showTournamentPendingMessage();
      return;
    }

    this.showTournamentResultMessageIfNeeded();
  }

  private formatRoundHudText(nowMs: number): string {
    const round = this.gameStateStore.getState().round;
    const visibleRound = Math.max(1, round.roundIndex);

    if (round.phase === "preparation") {
      return `Round ${visibleRound}/${round.totalRounds}\n${formatRoundTimer(
        getRoundRemainingMs(round, nowMs),
      )}`;
    }

    if (round.phase === "tournament") {
      return `Round ${visibleRound}/${round.totalRounds}\nTournament`;
    }

    if (round.phase === "round-result") {
      return `Round ${visibleRound}/${round.totalRounds}\nResult`;
    }

    if (round.phase === "game-result") {
      return "Game Result";
    }

    return "Round 대기";
  }

  private showTournamentPendingMessage(): void {
    if (this.roundAnnouncementText) {
      return;
    }

    this.roundAnnouncementText = this.add
      .text(
        Math.round(this.getViewportSize().width / 2),
        56,
        "준비 시간이 끝났다.\n토너먼트 대기 중",
        createGameTextStyle({
          align: "center",
          color: "#fff9dd",
          fontSize: "16px",
          stroke: "#263238",
          strokeThickness: 5,
        }),
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1001);
  }

  private showTournamentResultMessageIfNeeded(): void {
    const state = this.gameStateStore.getState();

    if (
      this.roundAnnouncementText ||
      (state.round.phase !== "round-result" && state.round.phase !== "game-result")
    ) {
      return;
    }

    const standings = createVisibleTournamentStandings(state);

    if (standings.length === 0) {
      return;
    }

    const panel = createTournamentResultPanelViewModel({
      roundIndex: state.round.roundIndex,
      totalRounds: state.round.totalRounds,
      final: state.round.phase === "game-result",
      standings,
      roundScores: state.tournament.lastRoundScores,
      cumulativeScores: state.tournament.scoresByPlayerId,
    });
    const text = [
      panel.title,
      ...panel.rows.map(formatTournamentResultRow),
      panel.nextActionLabel,
    ].join("\n");

    this.roundAnnouncementText = this.add
      .text(
        Math.round(this.getViewportSize().width / 2),
        56,
        text,
        createGameTextStyle({
          align: "center",
          color: "#fff9dd",
          fontSize: "14px",
          stroke: "#263238",
          strokeThickness: 5,
        }),
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1001);
  }

  private tryStartTournamentBattle(): boolean {
    if (this.battleIntroPlaying || this.tournamentBattleStarting || !this.player) {
      return false;
    }

    const state = this.gameStateStore.getState();
    const session = state.tournament.session;

    if (
      !session ||
      session.status !== "in-progress" ||
      session.roundIndex !== state.round.roundIndex
    ) {
      if (!this.isRoomTournamentHost()) {
        return false;
      }

      const tournamentPlayers = this.getEligibleTournamentPlayers();

      if (tournamentPlayers.length < 2) {
        return false;
      }

      const started = this.gameStateStore.startTournamentSession(
        tournamentPlayers.map(player => ({
          playerId: player.playerId,
          displayName: player.displayName,
        })),
      );

      if (!started.ok) {
        return false;
      }

      this.sendTournamentStartedMessage(started.session);
    }

    if (!this.isRoomTournamentHost()) {
      return false;
    }

    const match = this.gameStateStore.getCurrentTournamentMatch();

    if (!match) {
      return false;
    }

    const player = this.getTournamentBattlePlayer(match.participantA.playerId);
    const opponent = this.getTournamentBattlePlayer(match.participantB.playerId);

    if (
      !player ||
      !opponent ||
      !hasActiveTournamentPokemon(player) ||
      !hasActiveTournamentPokemon(opponent)
    ) {
      return false;
    }

    this.startTournamentBattle(match, player, opponent);

    return true;
  }

  private getEligibleTournamentPlayers(): LocalPlayerState[] {
    const state = this.gameStateStore.getState();
    const currentPlayer = state.playersById[state.currentPlayerId];
    const otherPlayers = Object.values(state.playersById)
      .filter(player => player.playerId !== state.currentPlayerId)
      .sort((left, right) =>
        left.playerId.localeCompare(right.playerId, undefined, { numeric: true }),
      );
    const localPlayers = [currentPlayer, ...otherPlayers].filter(
      (player): player is LocalPlayerState => Boolean(player),
    );
    const usedPlayerIds = new Set(localPlayers.map(player => player.playerId));
    const remotePlayers = [...this.remotePlayerSnapshots.values()]
      .map(snapshot => {
        const preferredPlayerId = snapshot.playerId?.trim() || snapshot.sessionId;
        const playerId = usedPlayerIds.has(preferredPlayerId)
          ? snapshot.sessionId
          : preferredPlayerId;
        const player = toTournamentLocalPlayerFromSnapshot(snapshot, playerId);

        if (player) {
          usedPlayerIds.add(player.playerId);
        }

        return player;
      })
      .filter((player): player is LocalPlayerState => Boolean(player))
      .sort((left, right) =>
        left.playerId.localeCompare(right.playerId, undefined, { numeric: true }),
      );

    return [...localPlayers, ...remotePlayers].filter(hasActiveTournamentPokemon).slice(0, 6);
  }

  private getTournamentBattlePlayer(playerId: string): LocalPlayerState | undefined {
    return this.getEligibleTournamentPlayers().find(player => player.playerId === playerId);
  }

  private startTournamentBattle(
    match: TournamentMatch,
    player: LocalPlayerState,
    opponent: LocalPlayerState,
  ): void {
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const facing = this.facing;

    this.tournamentBattleStarting = true;
    this.battleIntroPlaying = true;
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

    playBattleStartSound();
    this.playBattleIntroTransition(() => {
      this.scene.start("battle", battleData);
    });
  }

  private applyReturnedTournamentResult(data: WorldSceneCreateData): void {
    if (!isWorldTournamentBattleResult(data.tournamentResult)) {
      return;
    }

    const previousSession = this.gameStateStore.getState().tournament.session;
    const result = this.gameStateStore.recordTournamentMatchResult(
      data.tournamentResult.matchId,
      data.tournamentResult.winnerPlayerId,
      Date.now(),
    );

    const hostPlayerId = this.getRoomHostPlayerId();

    if (!previousSession || !hostPlayerId || !result.ok) {
      return;
    }

    const matchPayload = createTournamentMatchResultAuthorityPayload({
      hostPlayerId,
      session: previousSession,
      matchId: data.tournamentResult.matchId,
      winnerPlayerId: data.tournamentResult.winnerPlayerId,
    });

    if (matchPayload) {
      this.sendRoomMessage("TOURNAMENT_MATCH_RESULT", matchPayload);
    }

    if (!result.completed) {
      return;
    }

    const standings = result.standings.map(standing => ({
      playerId: standing.playerId,
      rank: standing.rank,
      score: standing.score,
    }));
    const completedPayload = createTournamentCompletedAuthorityPayload({
      hostPlayerId,
      session: result.session,
      standings,
    });

    if (completedPayload) {
      this.sendRoomMessage("TOURNAMENT_COMPLETED", completedPayload);
    }

    for (const payload of createRoundScoreUpdatedAuthorityPayloads({
      roundIndex: result.session.roundIndex,
      hostPlayerId,
      standings,
    })) {
      this.sendRoomMessage("ROUND_SCORE_UPDATED", payload);
    }
  }

  private createPartyHud(): void {
    this.renderPartyHud();

    if (this.partyHudSubscribed) {
      return;
    }

    this.partyHudSubscribed = true;
    this.unsubscribers.push(
      this.gameStateStore.subscribe(() => {
        this.renderPartyHud();
      }),
    );
  }

  private renderPartyHud(): void {
    this.partyHudObjects.forEach(object => object.destroy());
    this.partyHudObjects = [];

    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const slots = createPartyHudSlotViews({
      activePartySlotIndex: localPlayer.activePartySlotIndex,
      anchor: "middle-left",
      party: localPlayer.party,
      screenSize: this.getViewportSize(),
    });

    for (const slot of slots) {
      this.renderPartyHudSlot(slot);
    }
  }

  private renderPartyHudSlot(slot: PartyHudSlotView): void {
    const background = this.add
      .rectangle(
        slot.x,
        slot.y,
        PARTY_HUD_SLOT_SIZE.width,
        PARTY_HUD_SLOT_SIZE.height,
        slot.active ? 0xfff4a3 : 0xf8fbf0,
        0.88,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(900);
    background.setStrokeStyle(1, slot.active ? 0x355c7d : 0x263238, 0.95);
    this.partyHudObjects.push(background);

    if (!slot.pokemon) {
      const emptySlotText = this.add
        .text(
          slot.x + 28,
          slot.y + 9,
          "-",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "14px",
          }),
        )
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(902);
      this.partyHudObjects.push(emptySlotText);
      return;
    }

    const sprite = this.add
      .image(slot.x + 18, slot.y + 17, slot.pokemon.spriteKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(28, 28)
      .setScrollFactor(0)
      .setDepth(902);
    const name = this.add
      .text(
        slot.x + 34,
        slot.y + 6,
        slot.pokemon.name,
        createGameTextStyle({
          color: "#263238",
          fontSize: "8px",
        }),
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(902);
    const level = this.add
      .text(
        slot.x + 34,
        slot.y + 20,
        `Lv.${slot.pokemon.level}`,
        createGameTextStyle({
          color: "#263238",
          fontSize: "8px",
        }),
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(902);

    this.partyHudObjects.push(sprite, name, level);
  }

  private createStaticNpcs(map: ObjectLayerLookup): void {
    const npcObjects = map.getObjectLayer("Npcs")?.objects ?? [];
    this.staticNpcs = this.physics.add.staticGroup();

    for (const object of npcObjects) {
      const npcKey = object.name as keyof typeof FIELD_MAP.npcs | undefined;
      const npc = npcKey ? FIELD_MAP.npcs[npcKey] : undefined;

      if (!npc || typeof object.x !== "number" || typeof object.y !== "number") {
        continue;
      }

      const sprite = this.staticNpcs.create(
        object.x,
        object.y,
        npc.textureKey,
      ) as Phaser.Physics.Arcade.Sprite;

      sprite
        .setOrigin(0.5, 1)
        .setDisplaySize(npc.displaySize.width, npc.displaySize.height)
        .setDepth(18);
      sprite.body?.setSize(npc.hitbox.width, npc.hitbox.height);
      sprite.body?.setOffset(npc.hitbox.offsetX, npc.hitbox.offsetY);
      sprite.refreshBody();

      if (npcKey === "shopkeeper") {
        this.shopkeeperPosition = { x: object.x, y: object.y };
      }

      if (npcKey === "premiumShopkeeper") {
        this.premiumShopkeeperPosition = { x: object.x, y: object.y };
      }

      if (npcKey === "gamehost") {
        this.gamehostPosition = { x: object.x, y: object.y };
      }

      if (npcKey === "nurse") {
        this.nursePosition = { x: object.x, y: object.y };
      }
    }
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
    this.lastSent = { x: this.player.x, y: this.player.y };
    this.initializeEncounterTracking({ x: this.player.x, y: this.player.y });
  }

  private initializeEncounterTracking(position: { x: number; y: number }): void {
    this.stepTracker = createTileStepTracker(position);
    this.encounterLocked = false;
    this.battleIntroPlaying = false;
    this.tournamentBattleStarting = false;
  }

  private bindRoom(): void {
    this.unsubscribers.push(
      this.room.on("CURRENT_PLAYERS", ({ players }) => {
        this.gameStateStore.setSession({
          sessionId: this.room.sessionId,
          roomId: this.room.roomId,
          connectionStatus: "online",
        });
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
        this.roundAnnouncementText?.destroy();
        this.roundAnnouncementText = null;
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
        this.roundAnnouncementText?.destroy();
        this.roundAnnouncementText = null;
        this.showTournamentResultMessageIfNeeded();
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

  private ensureInteractionKeys(keyboard: Phaser.Input.Keyboard.KeyboardPlugin): void {
    if (this.interactionKeys) {
      return;
    }

    this.interactionKeys = {
      enter: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      z: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      backspace: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE),
      inventory: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      help: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
    };
  }

  private handleFieldInteractionInput(): void {
    const keyboard = this.input.keyboard;

    if (keyboard) {
      this.ensureInteractionKeys(keyboard);
    }

    const interactionKeys = this.interactionKeys;

    if (
      consumeVirtualGamepadPress("bag") ||
      (interactionKeys && Phaser.Input.Keyboard.JustDown(interactionKeys.inventory))
    ) {
      this.openInventory();
      return;
    }

    if (
      consumeVirtualGamepadPress("help") ||
      (interactionKeys && Phaser.Input.Keyboard.JustDown(interactionKeys.help))
    ) {
      this.openShortcutGuide();
      return;
    }

    if (consumeVirtualGamepadPress("confirm") || this.isConfirmJustDown()) {
      this.handleConfirmInteraction();
    }
  }

  private handleShortcutGuideKeyboardInput(): void {
    const keyboard = this.input.keyboard;

    if (keyboard) {
      this.ensureInteractionKeys(keyboard);
    }

    const interactionKeys = this.interactionKeys;

    if (
      consumeVirtualGamepadPress("help") ||
      consumeVirtualGamepadPress("back") ||
      consumeVirtualGamepadPress("confirm") ||
      (interactionKeys && Phaser.Input.Keyboard.JustDown(interactionKeys.help)) ||
      (interactionKeys && Phaser.Input.Keyboard.JustDown(interactionKeys.esc)) ||
      (interactionKeys && Phaser.Input.Keyboard.JustDown(interactionKeys.backspace)) ||
      this.isConfirmJustDown()
    ) {
      this.closeShortcutGuide();
    }
  }

  private handleInventoryKeyboardInput(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.ensureCursorKeys(keyboard);
    this.ensureInteractionKeys(keyboard);
    const interactionKeys = this.interactionKeys;

    if (!interactionKeys) {
      return;
    }

    if (
      consumeVirtualGamepadPress("up") ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.w)
    ) {
      this.moveInventorySelection(-1);
      return;
    }

    if (
      consumeVirtualGamepadPress("down") ||
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.s)
    ) {
      this.moveInventorySelection(1);
      return;
    }

    if (consumeVirtualGamepadPress("confirm") || this.isConfirmJustDown()) {
      this.confirmInventorySelection();
      return;
    }

    if (
      consumeVirtualGamepadPress("bag") ||
      consumeVirtualGamepadPress("back") ||
      Phaser.Input.Keyboard.JustDown(interactionKeys.inventory) ||
      Phaser.Input.Keyboard.JustDown(interactionKeys.esc) ||
      Phaser.Input.Keyboard.JustDown(interactionKeys.backspace)
    ) {
      this.closeInventory();
    }
  }

  private handleShopKeyboardInput(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.ensureCursorKeys(keyboard);
    this.ensureInteractionKeys(keyboard);

    if (
      consumeVirtualGamepadPress("up") ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.w)
    ) {
      this.moveShopSelection(-1);
      return;
    }

    if (
      consumeVirtualGamepadPress("down") ||
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.s)
    ) {
      this.moveShopSelection(1);
      return;
    }

    if (consumeVirtualGamepadPress("confirm") || this.isConfirmJustDown()) {
      this.confirmShopSelection();
      return;
    }

    if (
      consumeVirtualGamepadPress("back") ||
      (this.interactionKeys &&
        (Phaser.Input.Keyboard.JustDown(this.interactionKeys.esc) ||
          Phaser.Input.Keyboard.JustDown(this.interactionKeys.backspace)))
    ) {
      this.closeShop();
    }
  }

  private handleDiceGambleKeyboardInput(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.ensureCursorKeys(keyboard);
    this.ensureInteractionKeys(keyboard);

    if (
      consumeVirtualGamepadPress("up") ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.w)
    ) {
      this.moveDiceGambleSelection(-1);
      return;
    }

    if (
      consumeVirtualGamepadPress("down") ||
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.s)
    ) {
      this.moveDiceGambleSelection(1);
      return;
    }

    if (consumeVirtualGamepadPress("confirm") || this.isConfirmJustDown()) {
      this.confirmDiceGambleSelection();
      return;
    }

    if (
      consumeVirtualGamepadPress("back") ||
      (this.interactionKeys &&
        (Phaser.Input.Keyboard.JustDown(this.interactionKeys.esc) ||
          Phaser.Input.Keyboard.JustDown(this.interactionKeys.backspace)))
    ) {
      this.closeDiceGamble();
    }
  }

  private isConfirmJustDown(): boolean {
    if (!this.interactionKeys) {
      return false;
    }

    return (
      Phaser.Input.Keyboard.JustDown(this.interactionKeys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.interactionKeys.space) ||
      Phaser.Input.Keyboard.JustDown(this.interactionKeys.z)
    );
  }

  private handleConfirmInteraction(): void {
    if (!this.player) {
      return;
    }

    if (this.isPlayerNearShopkeeper()) {
      this.openShop("basic");
      return;
    }

    if (this.isPlayerNearPremiumShopkeeper()) {
      this.openShop("premium");
      return;
    }

    if (this.isPlayerNearNurse()) {
      this.healAtNurse();
      return;
    }

    if (this.isPlayerNearGamehost()) {
      this.openDiceGamble();
    }
  }

  private isPlayerNearShopkeeper(): boolean {
    if (!this.shopkeeperPosition) {
      return false;
    }

    return (
      Math.hypot(
        this.player.x - this.shopkeeperPosition.x,
        this.player.y - this.shopkeeperPosition.y,
      ) <= 56
    );
  }

  private isPlayerNearPremiumShopkeeper(): boolean {
    if (!this.premiumShopkeeperPosition) {
      return false;
    }

    return (
      Math.hypot(
        this.player.x - this.premiumShopkeeperPosition.x,
        this.player.y - this.premiumShopkeeperPosition.y,
      ) <= 56
    );
  }

  private isPlayerNearGamehost(): boolean {
    if (!this.gamehostPosition) {
      return false;
    }

    return (
      Math.hypot(
        this.player.x - this.gamehostPosition.x,
        this.player.y - this.gamehostPosition.y,
      ) <= 56
    );
  }

  private isPlayerNearNurse(): boolean {
    if (!this.nursePosition) {
      return false;
    }

    return (
      Math.hypot(this.player.x - this.nursePosition.x, this.player.y - this.nursePosition.y) <= 56
    );
  }

  private healAtNurse(): void {
    this.gameStateStore.healCurrentParty();
    this.nurseMessage = "포켓몬이 모두 회복됐다.";
    this.renderNurseMessage();
  }

  private renderNurseMessage(): void {
    this.nurseMessageObject?.destroy();

    if (!this.nurseMessage) {
      this.nurseMessageObject = null;
      return;
    }

    this.nurseMessageObject = this.add
      .text(
        Math.round(this.getViewportSize().width / 2),
        Math.round(this.getViewportSize().height - 74),
        this.nurseMessage,
        createGameTextStyle({
          align: "center",
          color: "#fff9dd",
          fontSize: "14px",
          stroke: "#263238",
          strokeThickness: 5,
        }),
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1800);
  }

  private openShop(shopKind: ShopKind = "basic"): void {
    this.activeShopKind = shopKind;
    this.shopOpen = true;
    this.shopSelectedIndex = 0;
    this.shopMessage = "";
    this.renderShopUi();
  }

  private closeShop(): void {
    this.shopOpen = false;
    this.shopMessage = "";
    this.destroyShopUi();
  }

  private moveShopSelection(delta: number): void {
    const shopItemIds = this.getCurrentShopItemIds();

    if (shopItemIds.length === 0) {
      this.shopSelectedIndex = 0;
      this.shopMessage = "";
      this.renderShopUi();
      return;
    }

    this.shopSelectedIndex =
      (this.shopSelectedIndex + delta + shopItemIds.length) % shopItemIds.length;
    this.shopMessage = "";
    this.renderShopUi();
  }

  private confirmShopSelection(): void {
    const shopItemIds = this.getCurrentShopItemIds();
    const itemId = shopItemIds[this.shopSelectedIndex] ?? shopItemIds[0];
    const item = this.getKnownShopItem(itemId);

    if (!item) {
      this.shopMessage = "아직 살 수 있는 상품이 없다.";
      this.renderShopUi();
      return;
    }

    const result =
      this.activeShopKind === "premium"
        ? this.gameStateStore.buyPremiumShopItem(item.id, 1)
        : this.gameStateStore.buyShopItem(item.id, 1);

    this.shopMessage = result.ok
      ? `${item.displayName}을 구매했다.`
      : result.reason === "insufficient-funds"
        ? "돈이 부족하다."
        : "구매할 수 없다.";
    this.renderShopUi();
  }

  private renderShopUi(): void {
    this.destroyShopUi();

    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const shopItemIds = this.getCurrentShopItemIds();
    this.shopSelectedIndex = clampSelectionIndex(this.shopSelectedIndex, shopItemIds.length);
    const selectedItem = this.getKnownShopItem(shopItemIds[this.shopSelectedIndex]);
    const panelOrigin = getCenteredPanelOrigin(SHOP_PANEL_SIZE, this.getViewportSize());
    const x = (offset: number) => panelOrigin.x + offset;
    const y = (offset: number) => panelOrigin.y + offset;
    const panel = this.add
      .rectangle(
        panelOrigin.x,
        panelOrigin.y,
        SHOP_PANEL_SIZE.width,
        SHOP_PANEL_SIZE.height,
        0xf8fbf0,
        0.96,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000);
    panel.setStrokeStyle(2, 0x263238, 1);
    this.shopUiObjects.push(panel);

    this.shopUiObjects.push(
      this.add
        .text(
          x(18),
          y(8),
          this.getCurrentShopTitle(),
          createGameTextStyle({
            color: "#263238",
            fontSize: "16px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
      this.add
        .text(
          x(364),
          y(8),
          formatPokeDollars(localPlayer.wallet.pokeDollars),
          createGameTextStyle({
            align: "right",
            color: "#263238",
            fontSize: "12px",
          }),
        )
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(2001),
    );

    shopItemIds.forEach((itemId, index) => {
      const item = this.getKnownShopItem(itemId);

      if (!item) {
        return;
      }

      const rowY = y(44 + index * 28);
      const selected = index === this.shopSelectedIndex;

      this.shopUiObjects.push(
        this.add
          .text(
            x(24),
            rowY,
            selected ? "▶" : " ",
            createGameTextStyle({
              color: "#263238",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001),
        this.add
          .text(
            x(40),
            rowY,
            item.displayName,
            createGameTextStyle({
              color: selected ? "#101820" : "#455a64",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001),
        this.add
          .text(
            x(186),
            rowY,
            formatPokeDollars(item.price),
            createGameTextStyle({
              color: "#455a64",
              fontSize: "12px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001),
        this.add
          .text(
            x(306),
            rowY,
            `x${localPlayer.inventory[item.id] ?? 0}`,
            createGameTextStyle({
              color: "#455a64",
              fontSize: "12px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001),
      );
    });

    this.shopUiObjects.push(
      this.add
        .text(
          x(24),
          y(160),
          selectedItem?.description ?? "랭크 3부터 희귀 상품이 열린다.",
          createGameTextStyle({
            color: "#263238",
            fontSize: "12px",
            wordWrap: { width: SHOP_PANEL_SIZE.width - 48 },
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
      this.add
        .text(
          x(24),
          y(222),
          this.shopMessage,
          createGameTextStyle({
            color: this.shopMessage === "돈이 부족하다." ? "#b71c1c" : "#1b5e20",
            fontSize: "12px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
    );
  }

  private destroyShopUi(): void {
    this.shopUiObjects.forEach(object => object.destroy());
    this.shopUiObjects = [];
  }

  private getCurrentShopItemIds(): KnownShopItemId[] {
    const rank = this.gameStateStore.getCurrentLocalPlayer().competitive.rank;

    return this.activeShopKind === "premium"
      ? getUnlockedPremiumShopItemIds(rank)
      : getUnlockedShopItemIds(rank);
  }

  private getCurrentShopTitle(): string {
    return this.activeShopKind === "premium" ? "희귀 상점" : "상점";
  }

  private getKnownShopItem(itemId: string | undefined): ShopItem | null {
    if (!itemId) {
      return null;
    }

    return getShopItemById(itemId) ?? null;
  }

  private openInventory(): void {
    this.inventoryOpen = true;
    this.inventorySelectedIndex = 0;
    this.inventoryMessage = "";
    this.renderInventoryUi();
  }

  private closeInventory(): void {
    this.inventoryOpen = false;
    this.inventoryMessage = "";
    this.destroyInventoryUi();
  }

  private moveInventorySelection(delta: number): void {
    const itemIds = this.getInventoryItemIds();
    this.inventorySelectedIndex =
      (this.inventorySelectedIndex + delta + itemIds.length) % itemIds.length;
    this.inventoryMessage = "";
    this.renderInventoryUi();
  }

  private confirmInventorySelection(): void {
    const itemIds = this.getInventoryItemIds();
    const itemId = itemIds[this.inventorySelectedIndex] ?? itemIds[0];
    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const result = this.gameStateStore.useInventoryItemOnPartySlot(
      itemId,
      localPlayer.activePartySlotIndex,
    );

    this.inventoryMessage = result.ok ? (result.messages.at(-1) ?? "") : result.message;
    this.renderInventoryUi();
  }

  private renderInventoryUi(): void {
    this.destroyInventoryUi();

    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const itemIds = this.getInventoryItemIds();
    this.inventorySelectedIndex = clampSelectionIndex(this.inventorySelectedIndex, itemIds.length);
    const selectedItemId = itemIds[this.inventorySelectedIndex] ?? itemIds[0];
    const selectedItem = this.getKnownShopItem(selectedItemId);
    const selectedCategory = selectedItem
      ? (INVENTORY_ITEM_CATEGORIES[selectedItem.id] ?? "기타")
      : "기타";
    const panelOrigin = getCenteredPanelOrigin(INVENTORY_PANEL_SIZE, this.getViewportSize());
    const x = (offset: number) => panelOrigin.x + offset;
    const y = (offset: number) => panelOrigin.y + offset;
    const panel = this.add
      .rectangle(
        panelOrigin.x,
        panelOrigin.y,
        INVENTORY_PANEL_SIZE.width,
        INVENTORY_PANEL_SIZE.height,
        0xf8fbf0,
        0.98,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2100);
    panel.setStrokeStyle(3, 0x263238, 1);
    this.inventoryUiObjects.push(panel);

    this.inventoryUiObjects.push(
      this.add
        .text(
          x(22),
          y(14),
          "가방",
          createGameTextStyle({
            color: "#263238",
            fontSize: "18px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2101),
      this.add
        .text(
          x(INVENTORY_PANEL_SIZE.width - 22),
          y(17),
          `보유 ${formatPokeDollars(localPlayer.wallet.pokeDollars)}`,
          createGameTextStyle({
            align: "right",
            color: "#263238",
            fontSize: "13px",
          }),
        )
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(2101),
    );

    const headerRule = this.add
      .rectangle(x(22), y(48), INVENTORY_PANEL_SIZE.width - 44, 2, 0x607d6c, 0.42)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2101);
    const categoryDivider = this.add
      .rectangle(x(144), y(62), 2, 210, 0x607d6c, 0.36)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2101);
    const detailPanel = this.add
      .rectangle(x(374), y(66), 160, 170, 0xe9eee1, 0.9)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2101);
    detailPanel.setStrokeStyle(1, 0x607d6c, 0.45);
    this.inventoryUiObjects.push(headerRule, categoryDivider, detailPanel);

    INVENTORY_CATEGORY_LABELS.forEach((category, index) => {
      const active = category === selectedCategory;
      const tab = this.add
        .rectangle(
          x(18),
          y(67 + index * 42),
          108,
          32,
          active ? 0xfff4a3 : 0xe9eee1,
          active ? 0.95 : 0.72,
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2101);
      tab.setStrokeStyle(1, active ? 0x263238 : 0x9aa690, active ? 0.85 : 0.4);

      this.inventoryUiObjects.push(
        tab,
        this.add
          .text(
            x(40),
            y(75 + index * 42),
            category,
            createGameTextStyle({
              color: active ? "#101820" : "#607d6c",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2102),
      );
    });

    itemIds.forEach((itemId, index) => {
      const item = this.getKnownShopItem(itemId);

      if (!item) {
        return;
      }

      const selected = index === this.inventorySelectedIndex;
      const rowY = y(76 + index * 24);
      const quantity = localPlayer.inventory[item.id] ?? 0;

      if (selected) {
        const rowHighlight = this.add
          .rectangle(x(164), rowY - 5, 188, 22, 0xfff4a3, 0.95)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2101);
        rowHighlight.setStrokeStyle(1, 0x263238, 0.65);
        this.inventoryUiObjects.push(rowHighlight);
      }

      this.inventoryUiObjects.push(
        this.add
          .text(
            x(172),
            rowY,
            selected ? "▶" : " ",
            createGameTextStyle({
              color: "#263238",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2102),
        this.add
          .text(
            x(198),
            rowY,
            item.displayName,
            createGameTextStyle({
              color: selected ? "#101820" : quantity > 0 ? "#263238" : "#78909c",
              fontSize: "12px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2102),
        this.add
          .text(
            x(342),
            rowY,
            `x${quantity}`,
            createGameTextStyle({
              align: "right",
              color: quantity > 0 ? "#263238" : "#78909c",
              fontSize: "12px",
            }),
          )
          .setOrigin(1, 0)
          .setScrollFactor(0)
          .setDepth(2102),
      );
    });

    this.inventoryUiObjects.push(
      this.add
        .text(
          x(392),
          y(82),
          "선택 항목",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "10px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2102),
      this.add
        .text(
          x(392),
          y(106),
          selectedItem?.displayName ?? "-",
          createGameTextStyle({
            color: "#101820",
            fontSize: "15px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2102),
      this.add
        .text(
          x(516),
          y(110),
          `x${selectedItem ? (localPlayer.inventory[selectedItem.id] ?? 0) : 0}`,
          createGameTextStyle({
            align: "right",
            color: "#263238",
            fontSize: "12px",
          }),
        )
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(2102),
      this.add
        .text(
          x(392),
          y(140),
          selectedItem?.description ?? "",
          createGameTextStyle({
            color: "#263238",
            fontSize: "11px",
            wordWrap: { width: 118 },
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2102),
      this.add
        .text(
          x(22),
          y(INVENTORY_PANEL_SIZE.height - 30),
          "I 닫기 · ↑↓ 선택",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "11px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2102),
      this.add
        .text(
          x(188),
          y(INVENTORY_PANEL_SIZE.height - 30),
          "Enter 사용",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "11px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2102),
      this.add
        .text(
          x(22),
          y(INVENTORY_PANEL_SIZE.height - 54),
          this.inventoryMessage,
          createGameTextStyle({
            color:
              this.inventoryMessage === "효과가 없다." || this.inventoryMessage.endsWith("없다!")
                ? "#b71c1c"
                : "#1b5e20",
            fontSize: "11px",
            wordWrap: { width: INVENTORY_PANEL_SIZE.width - 44 },
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2102),
    );
  }

  private destroyInventoryUi(): void {
    this.inventoryUiObjects.forEach(object => object.destroy());
    this.inventoryUiObjects = [];
  }

  private getInventoryItemIds(): KnownShopItemId[] {
    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const unlockedItemIds = new Set<string>([
      ...getUnlockedShopItemIds(localPlayer.competitive.rank),
      ...getUnlockedPremiumShopItemIds(localPlayer.competitive.rank),
    ]);

    return this.getAllInventoryItemIds().filter(
      itemId => unlockedItemIds.has(itemId) || (localPlayer.inventory[itemId] ?? 0) > 0,
    );
  }

  private getAllInventoryItemIds(): KnownShopItemId[] {
    return [...SHOP_ITEM_IDS, ...PREMIUM_SHOP_ITEM_IDS];
  }

  private showInitialShortcutGuideIfNeeded(): void {
    if (!this.gameStateStore.hasCurrentLocalPlayerViewedShortcutGuide()) {
      this.openShortcutGuide();
    }
  }

  private openShortcutGuide(): void {
    if (this.input.keyboard) {
      this.ensureInteractionKeys(this.input.keyboard);
    }

    this.input.off("pointerdown", this.handleShortcutGuidePointerDown, this);
    this.input.once("pointerdown", this.handleShortcutGuidePointerDown, this);
    this.shortcutGuideOpen = true;
    setShortcutGuideTouchControlsSuppressed(true);
    this.renderShortcutGuideUi();
  }

  private closeShortcutGuide(options: { markViewed?: boolean } = {}): void {
    const markViewed = options.markViewed ?? true;

    if (this.shortcutGuideOpen && markViewed) {
      this.gameStateStore.markCurrentLocalPlayerShortcutGuideViewed();
    }

    this.shortcutGuideOpen = false;
    setShortcutGuideTouchControlsSuppressed(false);
    this.input.off("pointerdown", this.handleShortcutGuidePointerDown, this);
    this.destroyShortcutGuideUi();
  }

  private handleShortcutGuidePointerDown(): void {
    this.closeShortcutGuide();
  }

  private renderShortcutGuideUi(): void {
    this.destroyShortcutGuideUi();

    const viewport = this.getViewportSize();
    const panelOrigin = getCenteredPanelOrigin(SHORTCUT_GUIDE_PANEL_SIZE, viewport);
    const x = (offset: number) => panelOrigin.x + offset;
    const y = (offset: number) => panelOrigin.y + offset;
    const scrim = this.add
      .rectangle(0, 0, viewport.width, viewport.height, 0x101820, 0.28)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2200);
    const panel = this.add
      .rectangle(
        panelOrigin.x,
        panelOrigin.y,
        SHORTCUT_GUIDE_PANEL_SIZE.width,
        SHORTCUT_GUIDE_PANEL_SIZE.height,
        0xf8fbf0,
        0.98,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2201);
    panel.setStrokeStyle(3, 0x263238, 1);
    this.shortcutGuideUiObjects.push(scrim, panel);

    this.shortcutGuideUiObjects.push(
      this.add
        .text(
          x(24),
          y(18),
          createShortcutGuideTitle("world"),
          createGameTextStyle({
            color: "#263238",
            fontSize: "18px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2202),
      this.add
        .rectangle(x(24), y(52), SHORTCUT_GUIDE_PANEL_SIZE.width - 48, 2, 0x607d6c, 0.42)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2202),
    );

    createShortcutGuideRows("world").forEach((row, index) => {
      const rowY = y(72 + index * 28);

      this.shortcutGuideUiObjects.push(
        this.add
          .text(
            x(34),
            rowY,
            row.action,
            createGameTextStyle({
              color: "#455a64",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2202),
        this.add
          .text(
            x(184),
            rowY,
            row.keys,
            createGameTextStyle({
              color: "#101820",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2202),
      );
    });

    this.shortcutGuideUiObjects.push(
      this.add
        .text(
          x(24),
          y(SHORTCUT_GUIDE_PANEL_SIZE.height - 34),
          "클릭 / Enter / H 닫기",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "11px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2202),
    );
  }

  private destroyShortcutGuideUi(): void {
    this.shortcutGuideUiObjects.forEach(object => object.destroy());
    this.shortcutGuideUiObjects = [];
  }

  private openDiceGamble(targetNumber = this.rollDiceGambleNumber()): void {
    this.diceGambleOpen = true;
    this.diceGambleRound = createDiceGambleRound(targetNumber);
    this.diceGambleSelectedIndex = 0;
    this.diceGambleMessage = "";
    this.renderDiceGambleUi();
  }

  private closeDiceGamble(): void {
    this.diceGambleOpen = false;
    this.diceGambleRound = null;
    this.diceGambleMessage = "";
    this.destroyDiceGambleUi();
  }

  private moveDiceGambleSelection(delta: number): void {
    this.diceGambleSelectedIndex =
      (this.diceGambleSelectedIndex + delta + DICE_GAMBLE_PREDICTIONS.length) %
      DICE_GAMBLE_PREDICTIONS.length;
    this.diceGambleMessage = "";
    this.renderDiceGambleUi();
  }

  private confirmDiceGambleSelection(rolledNumber = this.rollDiceGambleNumber()): void {
    if (!this.diceGambleRound) {
      return;
    }

    const prediction = DICE_GAMBLE_PREDICTIONS[this.diceGambleSelectedIndex];
    const option = this.diceGambleRound.options[prediction];

    if (option.winningCaseCount <= 0) {
      this.diceGambleMessage = "선택할 수 없는 예측이다.";
      this.renderDiceGambleUi();
      return;
    }

    const result = resolveDiceGambleRound(this.diceGambleRound, prediction, rolledNumber);
    const settlement = this.gameStateStore.settleDiceGambleResult({
      stakePokeDollars: result.stakePokeDollars,
      rewardPokeDollars: result.rewardPokeDollars,
    });

    if (!settlement.ok) {
      this.diceGambleMessage =
        settlement.reason === "insufficient-funds" ? "돈이 부족하다." : "정산할 수 없다.";
      this.renderDiceGambleUi();
      return;
    }

    this.diceGambleMessage = result.won
      ? `${result.rolledNumber}이 나왔다. 예측 성공! ${formatPokeDollars(result.rewardPokeDollars)}을 받았다.`
      : `${result.rolledNumber}이 나왔다. 예측 실패. ${formatPokeDollars(result.stakePokeDollars)}을 잃었다.`;
    this.diceGambleRound = createDiceGambleRound(this.rollDiceGambleNumber());
    this.diceGambleSelectedIndex = 0;
    this.renderDiceGambleUi();
  }

  private renderDiceGambleUi(): void {
    this.destroyDiceGambleUi();

    if (!this.diceGambleRound) {
      return;
    }

    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const panelOrigin = getCenteredPanelOrigin(DICE_GAMBLE_PANEL_SIZE, this.getViewportSize());
    const x = (offset: number) => panelOrigin.x + offset;
    const y = (offset: number) => panelOrigin.y + offset;
    const panel = this.add
      .rectangle(
        panelOrigin.x,
        panelOrigin.y,
        DICE_GAMBLE_PANEL_SIZE.width,
        DICE_GAMBLE_PANEL_SIZE.height,
        0xf8fbf0,
        0.96,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000);
    panel.setStrokeStyle(2, 0x263238, 1);
    this.diceGambleUiObjects.push(panel);

    this.diceGambleUiObjects.push(
      this.add
        .text(
          x(18),
          y(10),
          "주사위 겜블",
          createGameTextStyle({
            color: "#263238",
            fontSize: "16px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
      this.add
        .text(
          x(DICE_GAMBLE_PANEL_SIZE.width - 18),
          y(12),
          `지갑 ${formatPokeDollars(localPlayer.wallet.pokeDollars)}`,
          createGameTextStyle({
            align: "right",
            color: "#263238",
            fontSize: "12px",
          }),
        )
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(2001),
      this.add
        .text(
          x(24),
          y(46),
          `기준 숫자 ${this.diceGambleRound.targetNumber}`,
          createGameTextStyle({
            color: "#263238",
            fontSize: "13px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
      this.add
        .text(
          x(216),
          y(46),
          `배팅금 ${formatPokeDollars(DICE_GAMBLE_STAKE_POKE_DOLLARS)}`,
          createGameTextStyle({
            color: "#263238",
            fontSize: "13px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
      this.add
        .text(
          x(40),
          y(78),
          "옵션        경우의 수 / 보상",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "11px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
    );

    DICE_GAMBLE_PREDICTIONS.forEach((prediction, index) => {
      const option = this.diceGambleRound?.options[prediction];

      if (!option) {
        return;
      }

      const selected = index === this.diceGambleSelectedIndex;
      const impossible = option.winningCaseCount <= 0;
      const rowY = y(106 + index * 36);
      const optionText = `${DICE_GAMBLE_LABELS[prediction]}      ${option.winningCaseCount}/6  ${formatPokeDollars(option.rewardPokeDollars)}`;

      this.diceGambleUiObjects.push(
        this.add
          .text(
            x(24),
            rowY,
            selected ? "▶" : " ",
            createGameTextStyle({
              color: "#263238",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001),
        this.add
          .text(
            x(44),
            rowY,
            optionText,
            createGameTextStyle({
              color: selected ? "#101820" : impossible ? "#9e9e9e" : "#455a64",
              fontSize: "13px",
            }),
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001),
      );
    });

    this.diceGambleUiObjects.push(
      this.add
        .text(
          x(24),
          y(226),
          this.diceGambleMessage,
          createGameTextStyle({
            color:
              this.diceGambleMessage === "돈이 부족하다." ||
              this.diceGambleMessage === "선택할 수 없는 예측이다."
                ? "#b71c1c"
                : "#1b5e20",
            fontSize: "12px",
            wordWrap: { width: DICE_GAMBLE_PANEL_SIZE.width - 48 },
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2001),
    );
  }

  private destroyDiceGambleUi(): void {
    this.diceGambleUiObjects.forEach(object => object.destroy());
    this.diceGambleUiObjects = [];
  }

  private rollDiceGambleNumber(): DiceGambleNumber {
    return (Math.floor(Math.random() * 6) + 1) as DiceGambleNumber;
  }

  private maybeSendMovement(time: number): void {
    if (time - this.lastSentAt < 90) {
      return;
    }

    if (
      Math.abs(this.player.x - this.lastSent.x) < 1 &&
      Math.abs(this.player.y - this.lastSent.y) < 1
    ) {
      return;
    }

    this.sendRoomMessage("PLAYER_MOVED", this.createLocalPlayerSnapshot());
    this.gameStateStore.setLocalPlayerPosition({
      mapKey: FIELD_MAP.key,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.facing,
    });
    this.lastSentAt = time;
    this.lastSent = { x: this.player.x, y: this.player.y };
  }

  private maybeSendMovementEnd(time: number): void {
    if (time - this.lastSentAt < 90) {
      return;
    }

    this.sendRoomMessage("PLAYER_MOVEMENT_ENDED", this.createLocalPlayerSnapshot());
    this.gameStateStore.setLocalPlayerPosition({
      mapKey: FIELD_MAP.key,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.facing,
    });
    this.lastSentAt = time;
  }

  private checkWildEncounterAfterMovement(): void {
    if (!this.stepTracker || this.encounterLocked) {
      return;
    }

    const step = consumeCompletedTileStep(this.stepTracker, {
      x: this.player.x,
      y: this.player.y,
    });

    if (!step) {
      return;
    }

    const encounter = rollWildEncounter({
      ...this.getWildEncounterLevelRangeInput(),
      ...this.getWildEncounterConfigInput(),
      mapKey: FIELD_MAP.key,
      step,
      random: () => Math.random(),
    });

    if (!encounter) {
      return;
    }

    this.startWildBattle({
      encounter,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.facing,
    });
  }

  private getWildEncounterLevelRangeInput(): { levelRange?: WildEncounterLevelRange } {
    const averageLevel = calculateOccupiedPartyAverageLevel(
      this.gameStateStore.getCurrentLocalPlayer().party,
    );

    return averageLevel === null ? {} : { levelRange: createWildEncounterLevelRange(averageLevel) };
  }

  private getWildEncounterConfigInput(): {
    rate?: number;
    slots?: ReadonlyArray<WildEncounterSlot>;
  } {
    const areaId = resolveFieldEncounterAreaId({
      x: this.player.x,
      y: this.player.y,
    });
    const config = selectWildEncounterConfig(
      this.cache.json.get(WILD_ENCOUNTER_TABLES_JSON_ASSET[0]),
      FIELD_MAP.key,
      areaId,
    );

    return {
      ...(this.wildEncounterRateOverride !== undefined
        ? { rate: this.wildEncounterRateOverride }
        : config?.encounterRate !== undefined
          ? { rate: config.encounterRate }
          : {}),
      ...(config?.slots ? { slots: config.slots } : {}),
    };
  }

  private startWildBattle({ encounter, facing, x, y }: WildBattleStartInput): void {
    this.encounterLocked = true;
    this.battleIntroPlaying = true;
    this.player.setVelocity(0, 0);
    this.gameStateStore.setLocalPlayerPosition({
      mapKey: FIELD_MAP.key,
      x,
      y,
      facing,
    });
    const battleData = {
      battleKind: "wild",
      encounter,
      returnToWorld: {
        mapKey: FIELD_MAP.key,
        x,
        y,
        facing,
      },
    } as const;

    playBattleStartSound();
    this.playBattleIntroTransition(() => {
      this.scene.start("battle", battleData);
    });
  }

  private playBattleIntroTransition(onComplete: () => void): void {
    const { width, height } = this.getViewportSize();
    const depth = 10_000;
    const flash = this.add
      .rectangle(0, 0, width, height, 0xf8fbf0, 0.86)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.cameras.main.shake(BATTLE_INTRO_TIMING.flashMs, 0.004);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: BATTLE_INTRO_TIMING.flashMs,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    createBattleIntroStripes({
      width,
      height,
      stripeCount: BATTLE_INTRO_STRIPE_COUNT,
    }).forEach((stripe, index) => {
      const delayMs = BATTLE_INTRO_TIMING.flashMs + index * 16;
      const stripeBlock = this.add
        .rectangle(stripe.x, stripe.y, stripe.width, stripe.height, 0x101820, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(depth + 1 + index);

      this.tweens.add({
        targets: stripeBlock,
        x: 0,
        delay: delayMs,
        duration: Math.max(120, BATTLE_INTRO_TIMING.stripeMs - index * 16),
        ease: "Cubic.easeOut",
      });
    });

    const fade = this.add
      .rectangle(0, 0, width, height, 0x101820, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth + BATTLE_INTRO_STRIPE_COUNT + 1);

    this.tweens.add({
      targets: fade,
      alpha: 1,
      delay: BATTLE_INTRO_TIMING.flashMs + BATTLE_INTRO_TIMING.stripeMs,
      duration: BATTLE_INTRO_TIMING.fadeMs,
      ease: "Linear",
    });
    this.time.delayedCall(getBattleIntroDurationMs(), onComplete);
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

export function toTournamentLocalPlayerFromSnapshot(
  snapshot: PlayerSnapshot,
  playerIdOverride?: string,
): LocalPlayerState | null {
  const playerId = playerIdOverride?.trim() || snapshot.playerId?.trim() || snapshot.sessionId;
  const party = cloneSnapshotParty(snapshot.party);
  const activePartySlotIndex = normalizeSnapshotActivePartySlotIndex(
    snapshot.activePartySlotIndex,
    party,
  );

  if (activePartySlotIndex === null) {
    return null;
  }

  const defaultPlayer = createDefaultLocalPlayer(playerId);

  return {
    ...defaultPlayer,
    playerId,
    displayName: snapshot.displayName?.trim() || playerId,
    party,
    activePartySlotIndex,
    position: {
      mapKey: snapshot.map,
      x: snapshot.x,
      y: snapshot.y,
      facing: snapshot.facing,
    },
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

function normalizeSnapshotActivePartySlotIndex(
  activePartySlotIndex: number | undefined,
  party: NonNullable<PlayerSnapshot["party"]>,
): number | null {
  const requestedSlotIndex =
    typeof activePartySlotIndex === "number" && Number.isInteger(activePartySlotIndex)
      ? activePartySlotIndex
      : 0;

  if (party.some(slot => slot.slotIndex === requestedSlotIndex && slot.pokemon)) {
    return requestedSlotIndex;
  }

  return party.find(slot => slot.pokemon)?.slotIndex ?? null;
}

function createVisibleTournamentStandings(state: GameState): TournamentStanding[] {
  if (state.tournament.session?.status === "completed") {
    return getTournamentSessionStandings(state.tournament.session);
  }

  return state.tournament.standings.map(standing => ({
    playerId: standing.playerId,
    displayName: standing.displayName,
    seed: standing.seed,
    rank: standing.rank,
    champion: standing.rank === 1,
    eliminatedRoundNumber: standing.rank === 1 ? null : state.round.roundIndex,
  }));
}

export function formatPokeDollars(pokeDollars: number): string {
  return `₽ ${Math.max(0, Math.floor(pokeDollars)).toLocaleString("en-US")}`;
}

export function formatRankScoreHud({ rank, score }: PlayerCompetitiveStats): string {
  const rankLabel = rank === null ? "-" : rank.toLocaleString("en-US");

  return `Rank ${rankLabel}\nScore ${Math.max(0, Math.floor(score)).toLocaleString("en-US")}`;
}

function findObject(
  map: ObjectLayerLookup,
  layerName: string,
  objectName: string,
): SpawnObject | null {
  return map.getObjectLayer(layerName)?.objects.find(object => object.name === objectName) ?? null;
}

function hasActiveTournamentPokemon(player: LocalPlayerState): boolean {
  const activePokemon = player.party.find(
    slot => slot.slotIndex === player.activePartySlotIndex,
  )?.pokemon;

  if (!activePokemon || activePokemon.status === "fainted") {
    return false;
  }

  if (typeof activePokemon.currentHp === "number" && activePokemon.currentHp <= 0) {
    return false;
  }

  return true;
}

function isWorldTournamentBattleResult(value: unknown): value is WorldTournamentBattleResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WorldTournamentBattleResult).matchId === "string" &&
    typeof (value as WorldTournamentBattleResult).winnerPlayerId === "string" &&
    typeof (value as WorldTournamentBattleResult).loserPlayerId === "string" &&
    typeof (value as WorldTournamentBattleResult).reason === "string"
  );
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
