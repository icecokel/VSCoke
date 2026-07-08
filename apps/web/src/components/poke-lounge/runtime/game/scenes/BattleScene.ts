import * as Phaser from "phaser";
import {
  BATTLE_LAYOUT,
  getBattleOptionIndexAtPoint,
  hpRatio,
  resolveBattleOptionSlotRects,
  type BattleRect,
  type BattleSpriteBox,
} from "../battle/battleLayout";
import { createSampleBattleState } from "../battle/battleSampleState";
import {
  createWildBattleState,
  type RomPersonalRecordCollection,
  type RomRefinedMoveCollection,
} from "../battle/wildBattleFactory";
import { createPvpBattleState } from "../battle/pvpBattleFactory";
import {
  BATTLE_BACKGROUND_ASSET_KEY,
  BATTLE_WINDOW_FRAME_ASSET_KEY,
  ROM_BATTLE_WINDOW_STYLE,
} from "../battle/battleDesign";
import {
  playBattleCancelSound,
  playBattleConfirmSound,
  playBattleHitSound,
  playBattleStartSound,
  playPokemonFaintSound,
  playWildBattleBgm,
  stopWildBattleBgm,
} from "../battle/battleAudio";
import {
  BATTLE_END_CONFIRM_MESSAGE,
  chooseBattleBagItem,
  chooseBattleCommand,
  choosePartySlot,
  choosePlayerMove,
  popBattleMessage,
} from "../battle/battleLogic";
import type {
  BattleCommand,
  BattleMove,
  BattleParticipant,
  BattlePokemon,
  BattleScreenState,
} from "../battle/battleTypes";
import { applyLevelUpBattleMoves } from "../battle/levelUpMoves";
import {
  applyLevelUpEvolution,
  normalizePokemonEvolutionTable,
  type PokemonEvolutionTable,
} from "../battle/pokemon-evolution";
import { BATTLE_BASE_SIZE, getBattleCameraZoom } from "../gameViewport";
import { getDefaultGameStateStore } from "../state/defaultGameStateStore";
import {
  getShopItemById,
  getUnlockedPremiumShopItemIds,
  getUnlockedShopItemIds,
  SHOP_ITEM_IDS,
  type GameStateStore,
  type LocalPlayerState,
  type PremiumShopItemId,
  type PlayerPokemon,
  type ShopItemId,
} from "../state/gameStateStore";
import { createGameTextStyle } from "../ui/gameTextStyle";
import { createShortcutGuideRows, createShortcutGuideTitle } from "../ui/shortcutGuide";
import { consumeVirtualGamepadPress, resetVirtualGamepad } from "../input/virtualGamepad";
import { setShortcutGuideTouchControlsSuppressed } from "../input/mobileTouchControlsVisibility";
import type { WildEncounterCandidate } from "../world/wildEncounters";

export const BATTLE_COMMAND_LABELS = ["싸운다", "가방", "포켓몬", "도망"] as const;
export const BATTLE_SPRITE_CROP = { x: 0, y: 0, width: 80, height: 80 } as const;
export const BATTLE_SPRITE_SOURCE_SIZE = { width: 160, height: 80 } as const;
export const BATTLE_SPRITE_VISIBLE_ALPHA_THRESHOLD = 8;
export const BATTLE_SCENE_BACKGROUND_KEY = BATTLE_BACKGROUND_ASSET_KEY;
export const BATTLE_SCENE_WINDOW_FRAME_KEY = BATTLE_WINDOW_FRAME_ASSET_KEY;
export const BATTLE_SCENE_WINDOW_STYLE = ROM_BATTLE_WINDOW_STYLE;
export const BATTLE_HP_PANEL_WINDOW_OPTIONS = { radius: 4, includeFrameMarker: false } as const;
export const BATTLE_CONFIRM_KEY_CODES = [
  Phaser.Input.Keyboard.KeyCodes.ENTER,
  Phaser.Input.Keyboard.KeyCodes.SPACE,
  Phaser.Input.Keyboard.KeyCodes.Z,
] as const;
const BATTLE_HP_DECREASE_TWEEN_MS = 560;
const BATTLE_HIT_TWEEN_MS = 300;
const BATTLE_HIT_SHAKE_PIXELS = 4;
const BATTLE_ENTRANCE_TWEEN_MS = 640;
const BATTLE_BAG_PREMIUM_ITEM_IDS = [
  "hyperPotion",
  "revive",
  "ultraBall",
] as const satisfies readonly PremiumShopItemId[];

type PremiumBattleBagItemId = (typeof BATTLE_BAG_PREMIUM_ITEM_IDS)[number];
type BattleBagItemId = ShopItemId | PremiumBattleBagItemId;
export type BattleE2eScenario = "wild-victory" | "wild-defeat" | "wild-evolution";

export interface BattleE2eSnapshot {
  battleKind: BattleScreenState["battleKind"];
  phase: BattleScreenState["phase"];
  turn: number;
  message: string | null;
  messageQueue: string[];
  selectedCommandIndex: number;
  selectedCommand: BattleCommand;
  selectedCommandLabel: string;
  selectedMoveIndex: number;
  selectedMoveName: string | null;
  selectedBagItemIndex: number;
  selectedPartySlotIndex: number;
  result: BattleScreenState["result"];
  returnToWorld: BattleScreenState["returnToWorld"];
  battleEntrancePlaying: boolean;
  battleEntrancePlayed: boolean;
  hpAnimationPlaying: boolean;
  hpAnimationStartedCount: number;
  hitAnimationPlaying: boolean;
  hitAnimationStartedCount: number;
  player: {
    name: string;
    level: number;
    currentHp: number;
    maxHp: number;
    displayedCurrentHp: number;
    hitAnimationStartedCount: number;
    status: string;
    activePartySlotIndex: number;
  };
  opponent: {
    name: string;
    level: number;
    currentHp: number;
    maxHp: number;
    displayedCurrentHp: number;
    hitAnimationStartedCount: number;
    status: string;
  };
}

export interface WildBattleSceneData {
  battleKind: "wild";
  encounter: WildEncounterCandidate;
  returnToWorld: BattleScreenState["returnToWorld"];
}

export interface TrainerBattleSceneData {
  battleKind: "trainer";
  matchId: string;
  roundIndex: number;
  matchIndex: number;
  player: LocalPlayerState;
  opponent: LocalPlayerState;
  returnToWorld: BattleScreenState["returnToWorld"];
}

interface BattleE2eSceneData {
  e2eScenario: BattleE2eScenario;
}

interface LogicalCanvasPointInput {
  clientX: number;
  clientY: number;
  logicalSize: { width: number; height: number };
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">;
}

type BattleHpSide = "player" | "opponent";
type BattleDisplayedHp = Record<BattleHpSide, number>;
const BATTLE_HP_SIDES = ["player", "opponent"] as const satisfies readonly BattleHpSide[];

interface BattleHitEffectState {
  progress: number;
  startedCount: number;
  tween: Phaser.Tweens.Tween | null;
}

type BattleHitEffects = Record<BattleHpSide, BattleHitEffectState>;

export interface BattleSpriteVisibleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isWildBattleSceneData(data: unknown): data is WildBattleSceneData {
  return (
    isRecord(data) &&
    data.battleKind === "wild" &&
    isRecord(data.encounter) &&
    isRecord(data.returnToWorld)
  );
}

export function isTrainerBattleSceneData(data: unknown): data is TrainerBattleSceneData {
  return (
    isRecord(data) &&
    data.battleKind === "trainer" &&
    typeof data.matchId === "string" &&
    Number.isInteger(data.roundIndex) &&
    Number.isInteger(data.matchIndex) &&
    isRecord(data.player) &&
    isRecord(data.opponent) &&
    isRecord(data.returnToWorld)
  );
}

function isBattleE2eSceneData(data: unknown): data is BattleE2eSceneData {
  return (
    isRecord(data) &&
    (data.e2eScenario === "wild-victory" ||
      data.e2eScenario === "wild-defeat" ||
      data.e2eScenario === "wild-evolution")
  );
}

export function toLogicalCanvasPoint({
  clientX,
  clientY,
  logicalSize,
  rect,
}: LogicalCanvasPointInput): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) * logicalSize.width) / rect.width,
    y: ((clientY - rect.top) * logicalSize.height) / rect.height,
  };
}

export function getCroppedBattleSpriteDisplaySize(
  sprite: Pick<BattleSpriteBox, "width" | "height">,
): Pick<BattleSpriteBox, "width" | "height"> {
  return {
    width: Math.round(sprite.width * (BATTLE_SPRITE_SOURCE_SIZE.width / BATTLE_SPRITE_CROP.width)),
    height: Math.round(
      sprite.height * (BATTLE_SPRITE_SOURCE_SIZE.height / BATTLE_SPRITE_CROP.height),
    ),
  };
}

export function getCroppedBattleSpriteRenderBox(
  sprite: Pick<BattleSpriteBox, "x" | "y" | "width" | "height">,
): BattleRect {
  const displaySize = getCroppedBattleSpriteDisplaySize(sprite);

  return {
    x: sprite.x + (displaySize.width - sprite.width) / 2,
    y: sprite.y + (displaySize.height - sprite.height) / 2,
    width: displaySize.width,
    height: displaySize.height,
  };
}

export function getSingleFrameBattleSpriteRenderBox(
  sprite: Pick<BattleSpriteBox, "x" | "y" | "width" | "height">,
): BattleRect {
  return {
    x: sprite.x,
    y: sprite.y,
    width: sprite.width,
    height: sprite.height,
  };
}

export function getVisibleBoundsAlignedBattleSpriteRenderBox(
  sprite: Pick<BattleSpriteBox, "x" | "y" | "width" | "height">,
  visibleBounds: BattleSpriteVisibleBounds,
  crop: BattleSpriteVisibleBounds = BATTLE_SPRITE_CROP,
): BattleRect {
  const displaySize = getCroppedBattleSpriteDisplaySize(sprite);
  const scaleX = sprite.width / crop.width;
  const scaleY = sprite.height / crop.height;
  const visibleCenterX = visibleBounds.x + visibleBounds.width / 2;
  const visibleBottomY = visibleBounds.y + visibleBounds.height;
  const slotBottomY = sprite.y + sprite.height / 2;

  return {
    x: Math.round(sprite.x + displaySize.width / 2 - visibleCenterX * scaleX),
    y: Math.round(slotBottomY + displaySize.height / 2 - visibleBottomY * scaleY),
    width: displaySize.width,
    height: displaySize.height,
  };
}

export function formatBattleMoveMeta(move: BattleMove): string {
  return `PP ${move.pp}/${move.maxPp} ${move.type}`;
}

export const getBattleCommandIndexAtPoint = getBattleOptionIndexAtPoint;

const COMMANDS: Array<{ label: (typeof BATTLE_COMMAND_LABELS)[number]; command: BattleCommand }> = [
  { label: "싸운다", command: "fight" },
  { label: "가방", command: "bag" },
  { label: "포켓몬", command: "pokemon" },
  { label: "도망", command: "run" },
];

export class BattleScene extends Phaser.Scene {
  private state: BattleScreenState = createSampleBattleState();
  private selectedCommandIndex = 0;
  private selectedMoveIndex = 0;
  private selectedPartySlotIndex = 0;
  private selectedBagItemIndex = 0;
  private readonly spriteVisibleBoundsCache = new Map<string, BattleSpriteVisibleBounds>();
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private confirmKeys: Phaser.Input.Keyboard.Key[] = [];
  private escKey: Phaser.Input.Keyboard.Key | null = null;
  private backspaceKey: Phaser.Input.Keyboard.Key | null = null;
  private helpKey: Phaser.Input.Keyboard.Key | null = null;
  private shortcutGuideOpen = false;
  private returningToWorld = false;
  private displayedHp: BattleDisplayedHp = { player: 0, opponent: 0 };
  private readonly hpTweens: Partial<Record<BattleHpSide, Phaser.Tweens.Tween>> = {};
  private hitEffects: BattleHitEffects = createBattleHitEffects();
  private battleEntrancePlaying = false;
  private battleEntranceProgress = 1;
  private battleEntrancePlayed = false;
  private battleEntranceTween: Phaser.Tweens.Tween | null = null;
  private hpAnimationStartedCount = 0;
  private hitAnimationStartedCount = 0;

  constructor(private readonly gameStateStore: GameStateStore = getDefaultGameStateStore()) {
    super("battle");
  }

  create(data: unknown = {}): void {
    this.state = this.createInitialState(data);
    this.returningToWorld = false;
    this.battleEntrancePlayed = false;
    this.hpAnimationStartedCount = 0;
    this.hitAnimationStartedCount = 0;
    this.cancelHpTweens();
    this.resetHitEffects();
    this.syncDisplayedHpToState();
    this.cameras.main.setBackgroundColor("#d8e6d4");
    this.cameras.main.setBounds(0, 0, BATTLE_BASE_SIZE.width, BATTLE_BASE_SIZE.height);
    this.cameras.main.setZoom(getBattleCameraZoom(this.scale.width));
    this.bindKeys();
    this.bindPointerConfirm();
    this.render();
    playBattleStartSound();
    playWildBattleBgm();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopWildBattleBgm());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => stopWildBattleBgm());
    this.playBattleEntranceAnimation();
  }

  update(): void {
    if (
      !this.cursors ||
      this.confirmKeys.length === 0 ||
      !this.escKey ||
      !this.backspaceKey ||
      !this.helpKey
    ) {
      return;
    }

    if (this.battleEntrancePlaying) {
      resetVirtualGamepad();
      return;
    }

    if (consumeVirtualGamepadPress("help") || Phaser.Input.Keyboard.JustDown(this.helpKey)) {
      playBattleConfirmSound();
      this.toggleShortcutGuide();
      return;
    }

    if (this.shortcutGuideOpen) {
      if (
        consumeVirtualGamepadPress("confirm") ||
        consumeVirtualGamepadPress("back") ||
        this.confirmKeys.some(key => Phaser.Input.Keyboard.JustDown(key)) ||
        Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.backspaceKey)
      ) {
        playBattleCancelSound();
        this.closeShortcutGuide();
      }

      return;
    }

    if (
      consumeVirtualGamepadPress("bag") &&
      this.state.phase === "command" &&
      this.state.messageQueue.length === 0
    ) {
      playBattleConfirmSound();
      this.selectedBagItemIndex = 0;
      this.setBattleState(chooseBattleCommand(this.state, "bag"));
      return;
    }

    if (
      consumeVirtualGamepadPress("confirm") ||
      this.confirmKeys.some(key => Phaser.Input.Keyboard.JustDown(key))
    ) {
      playBattleConfirmSound();
      this.confirmSelection();
    }

    if (
      consumeVirtualGamepadPress("back") ||
      Phaser.Input.Keyboard.JustDown(this.escKey) ||
      Phaser.Input.Keyboard.JustDown(this.backspaceKey)
    ) {
      playBattleCancelSound();
      this.goBack();
    }

    if (this.state.phase === "command") {
      this.updateCommandSelection();
    }

    if (this.state.phase === "move-select") {
      this.updateMoveSelection();
    }

    if (this.state.phase === "party-select") {
      this.updatePartySelection();
    }

    if (this.state.phase === "bag-select") {
      this.updateBagSelection();
    }
  }

  confirmSelectionForTest(): void {
    this.confirmSelection();
  }

  getE2eSnapshotForTest(): BattleE2eSnapshot {
    const selectedCommand = COMMANDS[this.selectedCommandIndex] ?? COMMANDS[0];
    const selectedMove = this.state.player.pokemon.moves[this.selectedMoveIndex] ?? null;

    return {
      battleKind: this.state.battleKind,
      phase: this.state.phase,
      turn: this.state.turn,
      message: this.state.messageQueue[0] ?? null,
      messageQueue: [...this.state.messageQueue],
      selectedCommandIndex: this.selectedCommandIndex,
      selectedCommand: selectedCommand.command,
      selectedCommandLabel: selectedCommand.label,
      selectedMoveIndex: this.selectedMoveIndex,
      selectedMoveName: selectedMove?.name ?? null,
      selectedBagItemIndex: this.selectedBagItemIndex,
      selectedPartySlotIndex: this.selectedPartySlotIndex,
      result: this.state.result ? { ...this.state.result } : null,
      returnToWorld: this.state.returnToWorld ? { ...this.state.returnToWorld } : undefined,
      battleEntrancePlaying: this.battleEntrancePlaying,
      battleEntrancePlayed: this.battleEntrancePlayed,
      hpAnimationPlaying: this.isHpAnimationPlaying(),
      hpAnimationStartedCount: this.hpAnimationStartedCount,
      hitAnimationPlaying: this.isHitAnimationPlaying(),
      hitAnimationStartedCount: this.hitAnimationStartedCount,
      player: {
        name: this.state.player.pokemon.name,
        level: this.state.player.pokemon.level,
        currentHp: this.state.player.pokemon.currentHp,
        maxHp: this.state.player.pokemon.maxHp,
        displayedCurrentHp: Math.round(this.displayedHp.player),
        hitAnimationStartedCount: this.hitEffects.player.startedCount,
        status: this.state.player.pokemon.status,
        activePartySlotIndex: this.state.player.activePartySlotIndex,
      },
      opponent: {
        name: this.state.opponent.pokemon.name,
        level: this.state.opponent.pokemon.level,
        currentHp: this.state.opponent.pokemon.currentHp,
        maxHp: this.state.opponent.pokemon.maxHp,
        displayedCurrentHp: Math.round(this.displayedHp.opponent),
        hitAnimationStartedCount: this.hitEffects.opponent.startedCount,
        status: this.state.opponent.pokemon.status,
      },
    };
  }

  setBattleScenarioForTest(scenario: BattleE2eScenario): void {
    this.selectedCommandIndex = 0;
    this.selectedMoveIndex = 0;
    this.selectedPartySlotIndex = 0;
    this.selectedBagItemIndex = 0;
    this.returningToWorld = false;
    this.battleEntrancePlayed = false;
    this.hpAnimationStartedCount = 0;
    this.hitAnimationStartedCount = 0;
    this.state = createBattleScenarioStateForTest(scenario);
    this.cancelHpTweens();
    this.resetHitEffects();
    this.syncDisplayedHpToState();
    this.render();
    this.playBattleEntranceAnimation();
  }

  setSelectedCommandForTest(command: BattleCommand): void {
    const commandIndex = COMMANDS.findIndex(candidate => candidate.command === command);

    if (commandIndex < 0) {
      return;
    }

    this.selectedCommandIndex = commandIndex;
    this.render();
  }

  setSelectedMoveIndexForTest(index: number): void {
    if (!Number.isInteger(index)) {
      return;
    }

    this.selectedMoveIndex = Math.max(
      0,
      Math.min(this.state.player.pokemon.moves.length - 1, index),
    );
    this.render();
  }

  setSelectedBagItemIndexForTest(index: number): void {
    if (!Number.isInteger(index)) {
      return;
    }

    this.selectedBagItemIndex = Math.max(0, index);
    this.render();
  }

  setSelectedPartySlotIndexForTest(index: number): void {
    if (!Number.isInteger(index)) {
      return;
    }

    this.selectedPartySlotIndex = Math.max(0, Math.min(5, index));
    this.render();
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

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    this.cursors = keyboard.createCursorKeys();
    this.confirmKeys = BATTLE_CONFIRM_KEY_CODES.map(keyCode => keyboard.addKey(keyCode));
    this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.backspaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.helpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  }

  private bindPointerConfirm(): void {
    this.input.off("pointerdown", this.handlePointerConfirm, this);
    this.input.on("pointerdown", this.handlePointerConfirm, this);
  }

  private handlePointerConfirm(pointer: Phaser.Input.Pointer): void {
    if (this.battleEntrancePlaying) {
      return;
    }

    const battlePoint = this.toBattleWorldPoint(pointer);

    if (this.state.phase === "command" && this.state.messageQueue.length === 0) {
      const commandIndex = getBattleOptionIndexAtPoint(battlePoint, BATTLE_LAYOUT.commandWindow);

      if (commandIndex !== null) {
        this.selectedCommandIndex = commandIndex;
      }
    }

    if (this.state.phase === "move-select" && this.state.messageQueue.length === 0) {
      const moveIndex = getBattleOptionIndexAtPoint(battlePoint, BATTLE_LAYOUT.moveWindow);

      if (moveIndex !== null) {
        if (!this.state.player.pokemon.moves[moveIndex]) {
          return;
        }

        this.selectedMoveIndex = moveIndex;
      }
    }

    playBattleConfirmSound();
    this.confirmSelection();
  }

  private toBattleWorldPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    const nativeEvent = pointer.event as { clientX?: number; clientY?: number } | undefined;

    if (typeof nativeEvent?.clientX === "number" && typeof nativeEvent.clientY === "number") {
      const rect = this.game.canvas.getBoundingClientRect();
      const { x: canvasX, y: canvasY } = toLogicalCanvasPoint({
        clientX: nativeEvent.clientX,
        clientY: nativeEvent.clientY,
        logicalSize: {
          width: this.scale.width,
          height: this.scale.height,
        },
        rect,
      });

      return this.cameras.main.getWorldPoint(canvasX, canvasY);
    }

    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private createInitialState(data: unknown): BattleScreenState {
    if (isBattleE2eSceneData(data)) {
      return createBattleScenarioStateForTest(data.e2eScenario);
    }

    if (isTrainerBattleSceneData(data)) {
      return {
        ...createPvpBattleState({
          roundIndex: data.roundIndex,
          matchIndex: data.matchIndex,
          matchId: data.matchId,
          player: data.player,
          opponent: data.opponent,
        }),
        returnToWorld: data.returnToWorld,
      };
    }

    if (isWildBattleSceneData(data)) {
      const localPlayer = this.gameStateStore.getCurrentLocalPlayer();

      return createWildBattleState({
        encounter: data.encounter,
        playerPokemon: localPlayer.party[localPlayer.activePartySlotIndex]?.pokemon ?? undefined,
        playerParty: localPlayer.party,
        activePartySlotIndex: localPlayer.activePartySlotIndex,
        returnToWorld: data.returnToWorld,
        personalRecords: this.cache.json.get("romPersonalData") as RomPersonalRecordCollection,
        moveRecords: this.cache.json.get("romRefinedBattleRecords") as RomRefinedMoveCollection,
      });
    }

    return createSampleBattleState();
  }

  private confirmSelection(): void {
    if (this.battleEntrancePlaying) {
      return;
    }

    if (
      this.state.phase === "ended" &&
      this.state.returnToWorld &&
      this.state.messageQueue[0] === BATTLE_END_CONFIRM_MESSAGE
    ) {
      this.returnToWorld();
      return;
    }

    if (this.state.messageQueue.length > 0) {
      this.setBattleState(popBattleMessage(this.state));
      return;
    }

    if (this.state.phase === "ended" && this.state.returnToWorld) {
      this.returnToWorld();
      return;
    }

    if (this.state.phase === "command") {
      const command = COMMANDS[this.selectedCommandIndex]?.command ?? "fight";
      const nextState = chooseBattleCommand(this.state, command);

      if (command === "pokemon") {
        this.selectedPartySlotIndex = this.state.player.activePartySlotIndex;
      }

      if (command === "bag") {
        this.selectedBagItemIndex = 0;
      }

      this.setBattleState(nextState);
      return;
    }

    if (this.state.phase === "bag-select") {
      const battleBagItemIds = this.getBattleBagItemIds();
      const itemId = battleBagItemIds[this.selectedBagItemIndex] ?? battleBagItemIds[0];
      const nextState = chooseBattleBagItem(this.state, itemId, {
        itemCount: this.gameStateStore.getCurrentLocalPlayer().inventory[itemId] ?? 0,
      });

      if (nextState.usedInventoryItemId) {
        this.gameStateStore.consumeInventoryItem(nextState.usedInventoryItemId, 1);
      }

      this.setBattleState(nextState);
      return;
    }

    if (this.state.phase === "party-select") {
      this.setBattleState(choosePartySlot(this.state, this.selectedPartySlotIndex));
      return;
    }

    if (this.state.phase === "move-select") {
      this.setBattleState(
        this.applyLevelUpMoveLearning(choosePlayerMove(this.state, this.selectedMoveIndex)),
      );
    }
  }

  private setBattleState(
    nextState: BattleScreenState,
    options: { animateHpDecrease?: boolean; render?: boolean } = {},
  ): void {
    this.state = nextState;
    this.syncDisplayedHpTargets({
      animateHpDecrease: options.animateHpDecrease ?? true,
    });

    if (options.render ?? true) {
      this.render();
    }
  }

  private syncDisplayedHpToState(): void {
    this.displayedHp = {
      player: this.getStateHp("player"),
      opponent: this.getStateHp("opponent"),
    };
  }

  private syncDisplayedHpTargets({ animateHpDecrease }: { animateHpDecrease: boolean }): void {
    BATTLE_HP_SIDES.forEach(side => {
      const targetHp = this.getStateHp(side);
      const displayedHp = Number.isFinite(this.displayedHp[side])
        ? this.displayedHp[side]
        : targetHp;
      const existingTween = this.hpTweens[side];

      if (existingTween) {
        existingTween.stop();
        delete this.hpTweens[side];
      }

      if (animateHpDecrease && targetHp < displayedHp) {
        const tweenState = { value: displayedHp };

        this.hpAnimationStartedCount += 1;
        this.playHitAnimation(side);
        playBattleHitSound();
        if (targetHp <= 0) {
          playPokemonFaintSound();
        }
        this.hpTweens[side] = this.tweens.add({
          targets: tweenState,
          value: targetHp,
          duration: BATTLE_HP_DECREASE_TWEEN_MS,
          ease: "Cubic.easeOut",
          onUpdate: () => {
            this.displayedHp[side] = tweenState.value;
            this.render();
          },
          onComplete: () => {
            this.displayedHp[side] = targetHp;
            delete this.hpTweens[side];
            this.render();
          },
        });
        return;
      }

      this.displayedHp[side] = targetHp;
    });
  }

  private cancelHpTweens(): void {
    BATTLE_HP_SIDES.forEach(side => {
      this.hpTweens[side]?.stop();
      delete this.hpTweens[side];
    });
  }

  private resetHitEffects(): void {
    this.cancelHitTweens();
    this.hitEffects = createBattleHitEffects();
  }

  private cancelHitTweens(): void {
    BATTLE_HP_SIDES.forEach(side => {
      this.hitEffects[side]?.tween?.stop();
    });
  }

  private getStateHp(side: BattleHpSide): number {
    return side === "player"
      ? this.state.player.pokemon.currentHp
      : this.state.opponent.pokemon.currentHp;
  }

  private isHpAnimationPlaying(): boolean {
    return BATTLE_HP_SIDES.some(side => Boolean(this.hpTweens[side]));
  }

  private isHitAnimationPlaying(): boolean {
    return BATTLE_HP_SIDES.some(side => Boolean(this.hitEffects[side].tween));
  }

  private playHitAnimation(side: BattleHpSide): void {
    const hitEffect = this.hitEffects[side];
    const tweenState = { progress: 0 };

    hitEffect.tween?.stop();
    hitEffect.progress = 0;
    hitEffect.startedCount += 1;
    this.hitAnimationStartedCount += 1;

    const tween = this.tweens.add({
      targets: tweenState,
      progress: 1,
      duration: BATTLE_HIT_TWEEN_MS,
      ease: "Sine.easeOut",
      onUpdate: () => {
        hitEffect.progress = tweenState.progress;
        this.render();
      },
      onComplete: () => {
        hitEffect.progress = 0;
        if (hitEffect.tween === tween) {
          hitEffect.tween = null;
        }
        this.render();
      },
    });

    hitEffect.tween = tween;
  }

  private playBattleEntranceAnimation(): void {
    this.battleEntranceTween?.stop();
    this.battleEntranceProgress = 0;
    this.battleEntrancePlaying = true;
    this.battleEntrancePlayed = true;
    const tweenState = { progress: 0 };

    const tween = this.tweens.add({
      targets: tweenState,
      progress: 1,
      duration: BATTLE_ENTRANCE_TWEEN_MS,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.battleEntranceProgress = tweenState.progress;
        this.render();
      },
      onComplete: () => {
        this.battleEntranceProgress = 1;
        this.battleEntrancePlaying = false;
        if (this.battleEntranceTween === tween) {
          this.battleEntranceTween = null;
        }
        this.render();
      },
    });
    this.battleEntranceTween = tween;
  }

  private returnToWorld(): void {
    if (!this.state.returnToWorld || this.returningToWorld) {
      return;
    }

    this.returningToWorld = true;
    this.clearE2eSnapshot();
    this.setBattleState(this.applyLevelUpMoveLearning(this.state), {
      animateHpDecrease: false,
      render: false,
    });
    const returnToWorld = this.state.returnToWorld;

    if (!returnToWorld) {
      return;
    }

    const { mapKey, x, y, facing } = returnToWorld;
    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const previousCurrentPlayerId = this.gameStateStore.getState().currentPlayerId;

    if (this.state.battleKind === "trainer") {
      this.upsertTrainerBattleParticipant(this.state.player);
      this.upsertTrainerBattleParticipant(this.state.opponent);
      this.gameStateStore.setCurrentPlayer(previousCurrentPlayerId);
    } else if (localPlayer.party.length === 0) {
      this.gameStateStore.updateActivePokemon(toPlayerPokemon(this.state.player.pokemon));
    } else {
      this.state.player.party.forEach(slot => {
        if (slot.pokemon) {
          this.gameStateStore.updatePokemonInPartySlot(
            slot.slotIndex,
            toPlayerPokemon(slot.pokemon),
          );
        }
      });

      const activePartySlotIndex = this.state.player.activePartySlotIndex;
      const activePartySlot = this.state.player.party.find(
        slot => slot.slotIndex === activePartySlotIndex,
      );

      if (
        localPlayer.activePartySlotIndex !== activePartySlotIndex &&
        activePartySlot?.pokemon?.status !== "fainted"
      ) {
        this.gameStateStore.setActivePartySlot(activePartySlotIndex);
      }
    }

    if (this.state.result?.reason === "capture" && this.state.result.capturedPokemon) {
      this.gameStateStore.addPokemonToParty(toPlayerPokemon(this.state.result.capturedPokemon));
    }

    if (
      this.state.result?.winnerPlayerId === localPlayer.playerId &&
      (this.state.result.rewardPokeDollars ?? 0) > 0
    ) {
      const currentLocalPlayer = this.gameStateStore.getCurrentLocalPlayer();
      this.gameStateStore.setLocalPlayerPokeDollars(
        currentLocalPlayer.wallet.pokeDollars + (this.state.result.rewardPokeDollars ?? 0),
      );
    }

    this.gameStateStore.setLocalPlayerPosition({
      mapKey,
      x,
      y,
      facing,
    });

    stopWildBattleBgm();
    this.scene.start("world", {
      spawnPosition: {
        x,
        y,
        facing,
      },
      ...(this.state.battleKind === "trainer" && this.state.tournamentMatchId && this.state.result
        ? {
            tournamentResult: {
              matchId: this.state.tournamentMatchId,
              winnerPlayerId: this.state.result.winnerPlayerId,
              loserPlayerId: this.state.result.loserPlayerId,
              reason: this.state.result.reason,
            },
          }
        : {}),
    });
  }

  private upsertTrainerBattleParticipant(participant: BattleParticipant): void {
    const localPlayer = this.gameStateStore.getState().playersById[participant.playerId];

    if (!localPlayer) {
      return;
    }

    const participantPartyBySlot = new Map(
      participant.party
        .filter((slot): slot is BattleParticipant["party"][number] & { pokemon: BattlePokemon } =>
          Boolean(slot.pokemon),
        )
        .map(slot => [slot.slotIndex, toPlayerPokemon(slot.pokemon)] as const),
    );

    this.gameStateStore.upsertLocalPlayer({
      ...localPlayer,
      activePartySlotIndex: participant.activePartySlotIndex,
      party: localPlayer.party.map(slot => ({
        ...slot,
        pokemon: participantPartyBySlot.get(slot.slotIndex) ?? slot.pokemon,
      })),
    });
  }

  private applyLevelUpMoveLearning(state: BattleScreenState): BattleScreenState {
    if (
      state.battleKind !== "wild" ||
      state.result?.reason !== "faint" ||
      (state.result.levelsGained ?? 0) <= 0
    ) {
      return state;
    }

    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();

    if (state.result.winnerPlayerId !== localPlayer.playerId) {
      return state;
    }

    const moveRecords = this.cache.json.get("romRefinedBattleRecords");
    const personalRecords = this.cache.json.get("romPersonalData");
    const evolutionTable = normalizePokemonEvolutionTable(this.cache.json.get("pokemonData"));

    if (
      !isRomRefinedMoveCollection(moveRecords) ||
      !isRomPersonalRecordCollection(personalRecords)
    ) {
      return state;
    }

    const previousLevelBySlotIndex = new Map(
      localPlayer.party
        .filter(slot => slot.pokemon)
        .map(slot => [slot.slotIndex, slot.pokemon?.level ?? 1] as const),
    );
    const learningMessages: string[] = [];
    let activePokemon = state.player.pokemon;
    let activeSlotSeen = false;

    const party = state.player.party.map(slot => {
      if (!slot.pokemon) {
        return slot;
      }

      if (slot.slotIndex === state.player.activePartySlotIndex) {
        activeSlotSeen = true;
      }

      const previousLevel = resolvePreviousBattleLevel({
        activePartySlotIndex: state.player.activePartySlotIndex,
        fallbackLevelsGained: state.result?.levelsGained ?? 0,
        pokemon: slot.pokemon,
        previousLevel: previousLevelBySlotIndex.get(slot.slotIndex),
        slotIndex: slot.slotIndex,
      });

      if (previousLevel >= slot.pokemon.level) {
        return slot;
      }

      const moveLearningResult = applyLevelUpBattleMoves({
        pokemon: slot.pokemon,
        previousLevel,
        moveRecords,
      });
      const evolutionResult = applyEvolutionAfterLevelUp({
        evolutionTable,
        personalRecords,
        pokemon: moveLearningResult.pokemon,
        previousLevel,
      });

      if (moveLearningResult.messages.length === 0 && evolutionResult.messages.length === 0) {
        return slot;
      }

      learningMessages.push(...moveLearningResult.messages, ...evolutionResult.messages);

      if (slot.slotIndex === state.player.activePartySlotIndex) {
        activePokemon = evolutionResult.pokemon;
      }

      return {
        ...slot,
        pokemon: evolutionResult.pokemon,
      };
    });

    if (!activeSlotSeen) {
      const previousLevel = Math.max(
        1,
        state.player.pokemon.level - (state.result.levelsGained ?? 0),
      );
      const moveLearningResult = applyLevelUpBattleMoves({
        pokemon: state.player.pokemon,
        previousLevel,
        moveRecords,
      });
      const evolutionResult = applyEvolutionAfterLevelUp({
        evolutionTable,
        personalRecords,
        pokemon: moveLearningResult.pokemon,
        previousLevel,
      });

      if (moveLearningResult.messages.length > 0 || evolutionResult.messages.length > 0) {
        activePokemon = evolutionResult.pokemon;
        learningMessages.push(...moveLearningResult.messages, ...evolutionResult.messages);
      }
    }

    if (learningMessages.length === 0) {
      return state;
    }

    return {
      ...state,
      player: {
        ...state.player,
        pokemon: activePokemon,
        party,
      },
      messageQueue: insertMessagesBeforeBattleEndConfirm(state.messageQueue, learningMessages),
    };
  }

  private goBack(): void {
    if (
      this.state.phase === "move-select" ||
      this.state.phase === "party-select" ||
      this.state.phase === "bag-select"
    ) {
      this.setBattleState({ ...this.state, phase: "command" });
    }
  }

  private updateCommandSelection(): void {
    if (!this.cursors) {
      return;
    }

    if (consumeVirtualGamepadPress("left") || Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.selectedCommandIndex =
        this.selectedCommandIndex % 2 === 1
          ? this.selectedCommandIndex - 1
          : this.selectedCommandIndex;
      this.render();
    }
    if (consumeVirtualGamepadPress("right") || Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.selectedCommandIndex =
        this.selectedCommandIndex % 2 === 0
          ? Math.min(COMMANDS.length - 1, this.selectedCommandIndex + 1)
          : this.selectedCommandIndex;
      this.render();
    }
    if (consumeVirtualGamepadPress("up") || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedCommandIndex =
        this.selectedCommandIndex >= 2 ? this.selectedCommandIndex - 2 : this.selectedCommandIndex;
      this.render();
    }
    if (consumeVirtualGamepadPress("down") || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedCommandIndex =
        this.selectedCommandIndex < 2
          ? Math.min(COMMANDS.length - 1, this.selectedCommandIndex + 2)
          : this.selectedCommandIndex;
      this.render();
    }
  }

  private updateMoveSelection(): void {
    if (!this.cursors) {
      return;
    }

    const maxMoveIndex = Math.max(0, this.state.player.pokemon.moves.length - 1);

    if (consumeVirtualGamepadPress("left") || Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.selectedMoveIndex =
        this.selectedMoveIndex % 2 === 1 ? this.selectedMoveIndex - 1 : this.selectedMoveIndex;
      this.render();
    }
    if (consumeVirtualGamepadPress("right") || Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.selectedMoveIndex =
        this.selectedMoveIndex % 2 === 0
          ? Math.min(maxMoveIndex, this.selectedMoveIndex + 1)
          : this.selectedMoveIndex;
      this.render();
    }
    if (consumeVirtualGamepadPress("up") || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedMoveIndex =
        this.selectedMoveIndex >= 2 ? this.selectedMoveIndex - 2 : this.selectedMoveIndex;
      this.render();
    }
    if (consumeVirtualGamepadPress("down") || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedMoveIndex =
        this.selectedMoveIndex < 2
          ? Math.min(maxMoveIndex, this.selectedMoveIndex + 2)
          : this.selectedMoveIndex;
      this.render();
    }
  }

  private updatePartySelection(): void {
    if (!this.cursors) {
      return;
    }

    if (consumeVirtualGamepadPress("up") || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedPartySlotIndex = Math.max(0, this.selectedPartySlotIndex - 1);
      this.render();
    }
    if (consumeVirtualGamepadPress("down") || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedPartySlotIndex = Math.min(5, this.selectedPartySlotIndex + 1);
      this.render();
    }
  }

  private updateBagSelection(): void {
    if (!this.cursors) {
      return;
    }

    const battleBagItemIds = this.getBattleBagItemIds();
    if (consumeVirtualGamepadPress("up") || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedBagItemIndex = Math.max(0, this.selectedBagItemIndex - 1);
      this.render();
    }
    if (consumeVirtualGamepadPress("down") || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedBagItemIndex = Math.min(
        battleBagItemIds.length - 1,
        this.selectedBagItemIndex + 1,
      );
      this.render();
    }
  }

  private toggleShortcutGuide(): void {
    if (this.shortcutGuideOpen) {
      this.closeShortcutGuide();
      return;
    }

    this.openShortcutGuide();
  }

  private openShortcutGuide(): void {
    this.shortcutGuideOpen = true;
    setShortcutGuideTouchControlsSuppressed(true);
    this.render();
  }

  private closeShortcutGuide(): void {
    this.shortcutGuideOpen = false;
    setShortcutGuideTouchControlsSuppressed(false);
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    this.drawBackground();
    this.drawPokemon();
    this.drawHpPanel(BATTLE_LAYOUT.opponentHpPanel, this.state.opponent.pokemon, "opponent", false);
    this.drawHpPanel(BATTLE_LAYOUT.playerHpPanel, this.state.player.pokemon, "player", true);
    this.publishE2eSnapshot();

    if (this.state.phase === "move-select") {
      this.drawMoveWindow();
      this.drawShortcutGuideIfOpen();
      this.drawBattleEntranceOverlay();
      return;
    }

    if (this.state.phase === "party-select" && this.state.messageQueue.length === 0) {
      this.drawPartySelectWindow();
      this.drawShortcutGuideIfOpen();
      this.drawBattleEntranceOverlay();
      return;
    }

    if (this.state.phase === "bag-select" && this.state.messageQueue.length === 0) {
      this.drawBagSelectWindow();
      this.drawShortcutGuideIfOpen();
      this.drawBattleEntranceOverlay();
      return;
    }

    if (this.state.phase === "command" && this.state.messageQueue.length === 0) {
      this.drawCommandWindow();
      this.drawShortcutGuideIfOpen();
      this.drawBattleEntranceOverlay();
      return;
    }

    this.drawMessageWindow(this.state.messageQueue[0] ?? BATTLE_END_CONFIRM_MESSAGE);
    this.drawShortcutGuideIfOpen();
    this.drawBattleEntranceOverlay();
  }

  private drawBackground(): void {
    this.add
      .image(BATTLE_BASE_SIZE.width / 2, BATTLE_BASE_SIZE.height / 2, BATTLE_SCENE_BACKGROUND_KEY)
      .setDisplaySize(BATTLE_BASE_SIZE.width, BATTLE_BASE_SIZE.height);
  }

  private drawPokemon(): void {
    const opponent = BATTLE_LAYOUT.opponentSprite;
    const player = BATTLE_LAYOUT.playerSprite;
    const entranceProgress = Phaser.Math.Clamp(this.battleEntranceProgress, 0, 1);
    const entranceOffset = Math.round((1 - entranceProgress) * 18);
    const entranceAlpha = 0.35 + entranceProgress * 0.65;
    const opponentHit = this.getHitRenderEffect("opponent");
    const playerHit = this.getHitRenderEffect("player");
    const opponentRenderBox = getVisibleBoundsAlignedBattleSpriteRenderBox(
      opponent,
      this.resolveBattleSpriteVisibleBounds(this.state.opponent.pokemon.frontSprite.assetKey),
    );
    const playerRenderBox = getCroppedBattleSpriteRenderBox(player);
    this.add
      .image(
        opponentRenderBox.x + entranceOffset + opponentHit.offsetX,
        opponentRenderBox.y,
        this.state.opponent.pokemon.frontSprite.assetKey,
      )
      .setCrop(
        BATTLE_SPRITE_CROP.x,
        BATTLE_SPRITE_CROP.y,
        BATTLE_SPRITE_CROP.width,
        BATTLE_SPRITE_CROP.height,
      )
      .setDisplaySize(opponentRenderBox.width, opponentRenderBox.height)
      .setAlpha(entranceAlpha * opponentHit.alpha);
    this.add
      .image(
        playerRenderBox.x - entranceOffset + playerHit.offsetX,
        playerRenderBox.y,
        this.state.player.pokemon.backSprite.assetKey,
      )
      .setCrop(
        BATTLE_SPRITE_CROP.x,
        BATTLE_SPRITE_CROP.y,
        BATTLE_SPRITE_CROP.width,
        BATTLE_SPRITE_CROP.height,
      )
      .setDisplaySize(playerRenderBox.width, playerRenderBox.height)
      .setAlpha(entranceAlpha * playerHit.alpha);
  }

  private getHitRenderEffect(side: BattleHpSide): { alpha: number; offsetX: number } {
    const progress = Phaser.Math.Clamp(this.hitEffects[side].progress, 0, 1);

    if (progress <= 0 || progress >= 1) {
      return { alpha: 1, offsetX: 0 };
    }

    const dampening = 1 - progress;
    const shake = Math.sin(progress * Math.PI * 7) * BATTLE_HIT_SHAKE_PIXELS * dampening;
    const direction = side === "player" ? -1 : 1;
    const flashAlpha = progress < 0.35 ? 0.58 : 1;

    return {
      alpha: flashAlpha,
      offsetX: Math.round(shake * direction),
    };
  }

  private resolveBattleSpriteVisibleBounds(assetKey: string): BattleSpriteVisibleBounds {
    const cachedBounds = this.spriteVisibleBoundsCache.get(assetKey);

    if (cachedBounds) {
      return cachedBounds;
    }

    const textureManager = (
      this as unknown as {
        textures?: Pick<Phaser.Textures.TextureManager, "getPixelAlpha">;
      }
    ).textures;

    if (!textureManager || typeof textureManager.getPixelAlpha !== "function") {
      return BATTLE_SPRITE_CROP;
    }

    let minX: number = BATTLE_SPRITE_CROP.width;
    let minY: number = BATTLE_SPRITE_CROP.height;
    let maxX: number = -1;
    let maxY: number = -1;

    for (let y = BATTLE_SPRITE_CROP.y; y < BATTLE_SPRITE_CROP.y + BATTLE_SPRITE_CROP.height; y++) {
      for (let x = BATTLE_SPRITE_CROP.x; x < BATTLE_SPRITE_CROP.x + BATTLE_SPRITE_CROP.width; x++) {
        const alpha = textureManager.getPixelAlpha(x, y, assetKey);

        if (typeof alpha === "number" && alpha > BATTLE_SPRITE_VISIBLE_ALPHA_THRESHOLD) {
          minX = Math.min(minX, x - BATTLE_SPRITE_CROP.x);
          minY = Math.min(minY, y - BATTLE_SPRITE_CROP.y);
          maxX = Math.max(maxX, x - BATTLE_SPRITE_CROP.x);
          maxY = Math.max(maxY, y - BATTLE_SPRITE_CROP.y);
        }
      }
    }

    const bounds =
      maxX >= minX && maxY >= minY
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : BATTLE_SPRITE_CROP;

    this.spriteVisibleBoundsCache.set(assetKey, bounds);
    return bounds;
  }

  private drawHpPanel(
    rect: BattleRect,
    pokemon: BattlePokemon,
    side: BattleHpSide,
    alignRight: boolean,
  ): void {
    const graphics = this.drawRomWindow(rect, BATTLE_HP_PANEL_WINDOW_OPTIONS);
    const displayedCurrentHp = Number.isFinite(this.displayedHp[side])
      ? Math.min(pokemon.maxHp, Math.max(0, this.displayedHp[side]))
      : pokemon.currentHp;

    const nameX = alignRight ? rect.x + 8 : rect.x + 6;
    this.add.text(
      nameX,
      rect.y + 4,
      `${pokemon.name} Lv.${pokemon.level}`,
      createGameTextStyle({
        color: "#17201a",
        fontSize: "8px",
      }),
    );

    const barWidth = rect.width - 20;
    const barX = rect.x + 10;
    const barY = rect.y + rect.height - 10;
    graphics.fillStyle(BATTLE_SCENE_WINDOW_STYLE.hpBack, 1).fillRect(barX, barY, barWidth, 4);
    graphics
      .fillStyle(BATTLE_SCENE_WINDOW_STYLE.hpGood, 1)
      .fillRect(barX, barY, Math.round(barWidth * hpRatio(displayedCurrentHp, pokemon.maxHp)), 4);
  }

  private drawBattleEntranceOverlay(): void {
    if (!this.battleEntrancePlaying && this.battleEntranceProgress >= 1) {
      return;
    }

    const progress = Phaser.Math.Clamp(this.battleEntranceProgress, 0, 1);
    const coverAlpha = 1 - progress;
    const graphics = this.add.graphics().setDepth(10_000);

    graphics
      .fillStyle(0x101820, Math.max(0, coverAlpha))
      .fillRect(0, 0, BATTLE_BASE_SIZE.width, BATTLE_BASE_SIZE.height);

    const stripeAlpha = Math.max(0, 0.42 - progress * 0.5);

    if (stripeAlpha <= 0) {
      return;
    }

    const stripeHeight = Math.ceil(BATTLE_BASE_SIZE.height / 6);

    for (let index = 0; index < 6; index += 1) {
      const width = Math.round(BATTLE_BASE_SIZE.width * (1 - progress));
      const x = index % 2 === 0 ? 0 : BATTLE_BASE_SIZE.width - width;

      graphics
        .fillStyle(0xf8fbf0, stripeAlpha)
        .fillRect(x, index * stripeHeight, width, Math.min(stripeHeight, BATTLE_BASE_SIZE.height));
    }
  }

  private drawMessageWindow(message: string): void {
    const rect = BATTLE_LAYOUT.bottomWindow;
    this.drawRomWindow(rect, { radius: 0, includeFrameMarker: false });
    this.add.text(
      rect.x + 10,
      rect.y + 12,
      message,
      createGameTextStyle({
        color: "#17201a",
        fontSize: "10px",
        wordWrap: { width: rect.width - 20, useAdvancedWrap: true },
      }),
    );
  }

  private drawCommandWindow(): void {
    const rect = BATTLE_LAYOUT.commandWindow;
    this.drawRomWindow(rect, { radius: 0, includeFrameMarker: false });

    COMMANDS.forEach((item, index) => {
      const slot = resolveBattleOptionSlotRects(rect)[index];

      if (!slot) {
        return;
      }

      this.drawBattleOptionSlot(slot, {
        selected: index === this.selectedCommandIndex,
        disabled: false,
      });
      this.add.text(
        slot.x + 10,
        slot.y + 4,
        `${index === this.selectedCommandIndex ? "▶ " : ""}${item.label}`,
        createGameTextStyle({
          color: "#17201a",
          fontSize: "8px",
        }),
      );
    });
  }

  private drawMoveWindow(): void {
    const rect = BATTLE_LAYOUT.moveWindow;
    this.drawRomWindow(rect, { radius: 0, includeFrameMarker: false });

    resolveBattleOptionSlotRects(rect).forEach((slot, index) => {
      const move = this.state.player.pokemon.moves[index] ?? null;
      const disabled = !move;

      this.drawBattleOptionSlot(slot, {
        selected: index === this.selectedMoveIndex && !disabled,
        disabled,
      });
      this.add.text(
        slot.x + 10,
        slot.y + 3,
        move ? `${index === this.selectedMoveIndex ? "▶ " : ""}${move.name}` : "-",
        createGameTextStyle({
          color: disabled ? "#7a827c" : "#17201a",
          fontSize: "7px",
        }),
      );

      if (move) {
        this.add.text(
          slot.x + slot.width - 58,
          slot.y + 5,
          formatBattleMoveMeta(move),
          createGameTextStyle({
            color: "#7a827c",
            fontSize: "5px",
          }),
        );
      }
    });
  }

  private drawBattleOptionSlot(
    rect: BattleRect,
    options: { selected: boolean; disabled: boolean },
  ): void {
    const graphics = this.add.graphics();
    const fillAlpha = options.disabled ? 0.58 : 1;

    graphics
      .fillStyle(BATTLE_SCENE_WINDOW_STYLE.shadow, options.selected ? 0.42 : 0.24)
      .fillRect(rect.x + 1, rect.y + 1, rect.width, rect.height)
      .fillStyle(BATTLE_SCENE_WINDOW_STYLE.fill, fillAlpha)
      .fillRect(rect.x, rect.y, rect.width, rect.height)
      .lineStyle(1, BATTLE_SCENE_WINDOW_STYLE.highlight, 0.95)
      .strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2)
      .lineStyle(options.selected ? 2 : 1, BATTLE_SCENE_WINDOW_STYLE.border, 1)
      .strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);

    if (options.selected) {
      graphics
        .fillStyle(BATTLE_SCENE_WINDOW_STYLE.hpGood, 1)
        .fillRect(rect.x + 4, rect.y + 4, 3, rect.height - 8);
    }
  }

  private drawPartySelectWindow(): void {
    const rect = BATTLE_LAYOUT.moveWindow;
    this.drawRomWindow(rect, { radius: 0, includeFrameMarker: true });

    Array.from({ length: 6 }, (_, slotIndex) => {
      const slot = this.state.player.party.find(candidate => candidate.slotIndex === slotIndex);
      const pokemon = slot?.pokemon;
      const label = pokemon
        ? `${pokemon.name} Lv.${pokemon.level} HP ${pokemon.currentHp}/${pokemon.maxHp}`
        : "-";

      this.add.text(
        rect.x + 10,
        rect.y + 4 + slotIndex * 7,
        `${slotIndex === this.selectedPartySlotIndex ? "▶" : " "} ${label}`,
        createGameTextStyle({
          color: "#17201a",
          fontSize: "7px",
        }),
      );
    });
  }

  private drawBagSelectWindow(): void {
    const rect = BATTLE_LAYOUT.moveWindow;
    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const inventory = localPlayer.inventory;
    const battleBagItemIds = this.getBattleBagItemIds();
    this.selectedBagItemIndex = Math.max(
      0,
      Math.min(battleBagItemIds.length - 1, this.selectedBagItemIndex),
    );
    this.drawRomWindow(rect, { radius: 0, includeFrameMarker: true });

    battleBagItemIds.forEach((itemId, index) => {
      const item = getShopItemById(itemId);

      if (!item) {
        return;
      }

      const quantity = inventory[itemId] ?? 0;
      const y = rect.y + 6 + index * 11;

      this.add.text(
        rect.x + 10,
        y,
        `${index === this.selectedBagItemIndex ? "▶" : " "} ${item.displayName}`,
        createGameTextStyle({
          color: quantity > 0 ? "#17201a" : "#7a827c",
          fontSize: "8px",
        }),
      );
      this.add.text(
        rect.x + 148,
        y,
        `x${quantity}`,
        createGameTextStyle({
          color: quantity > 0 ? "#17201a" : "#7a827c",
          fontSize: "8px",
        }),
      );
    });
  }

  private getBattleBagItemIds(): BattleBagItemId[] {
    const localPlayer = this.gameStateStore.getCurrentLocalPlayer();
    const unlockedItemIds = getUnlockedShopItemIds(localPlayer.competitive.rank);
    const unlockedPremiumItemIds = getUnlockedPremiumShopItemIds(localPlayer.competitive.rank);

    const basicItemIds = SHOP_ITEM_IDS.filter(
      itemId => unlockedItemIds.includes(itemId) || (localPlayer.inventory[itemId] ?? 0) > 0,
    );
    const premiumItemIds = BATTLE_BAG_PREMIUM_ITEM_IDS.filter(
      itemId => unlockedPremiumItemIds.includes(itemId) || (localPlayer.inventory[itemId] ?? 0) > 0,
    );

    return [...basicItemIds, ...premiumItemIds];
  }

  private drawShortcutGuideIfOpen(): void {
    if (!this.shortcutGuideOpen) {
      return;
    }

    const rect = { x: 48, y: 30, width: 198, height: 132 };
    this.drawRomWindow(rect, { radius: 0, includeFrameMarker: true });
    this.add.text(
      rect.x + 12,
      rect.y + 10,
      createShortcutGuideTitle("battle"),
      createGameTextStyle({
        color: "#17201a",
        fontSize: "10px",
      }),
    );

    createShortcutGuideRows("battle").forEach((row, index) => {
      const rowY = rect.y + 30 + index * 17;

      this.add.text(
        rect.x + 14,
        rowY,
        row.action,
        createGameTextStyle({
          color: "#4b554f",
          fontSize: "8px",
        }),
      );
      this.add.text(
        rect.x + 82,
        rowY,
        row.keys,
        createGameTextStyle({
          color: "#17201a",
          fontSize: "8px",
        }),
      );
    });

    this.add.text(
      rect.x + 12,
      rect.y + rect.height - 16,
      "Enter / H / Esc 닫기",
      createGameTextStyle({
        color: "#4b554f",
        fontSize: "7px",
      }),
    );
  }

  private drawRomWindow(
    rect: BattleRect,
    options: { radius: number; includeFrameMarker: boolean },
  ): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    const radius = options.radius;
    graphics
      .fillStyle(BATTLE_SCENE_WINDOW_STYLE.shadow, 0.86)
      .fillRoundedRect(rect.x + 2, rect.y + 2, rect.width, rect.height, radius);
    graphics
      .fillStyle(BATTLE_SCENE_WINDOW_STYLE.fill, 1)
      .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
    graphics
      .lineStyle(1, BATTLE_SCENE_WINDOW_STYLE.highlight, 1)
      .strokeRoundedRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2, radius);
    graphics
      .lineStyle(2, BATTLE_SCENE_WINDOW_STYLE.border, 1)
      .strokeRoundedRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4, radius);

    if (options.includeFrameMarker) {
      this.drawWindowFrameMarker(rect);
    }

    return graphics;
  }

  private drawWindowFrameMarker(rect: BattleRect): void {
    this.add
      .image(rect.x + rect.width - 12, rect.y + 4, BATTLE_SCENE_WINDOW_FRAME_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(8, 8)
      .setAlpha(0.82);
  }

  private publishE2eSnapshot(): void {
    if (!isLocalE2eBattleProbeEnabled()) {
      return;
    }

    document.documentElement.dataset.pokeLoungeE2eBattle = JSON.stringify(
      this.getE2eSnapshotForTest(),
    );
  }

  private clearE2eSnapshot(): void {
    if (!isLocalE2eBattleProbeEnabled()) {
      return;
    }

    delete document.documentElement.dataset.pokeLoungeE2eBattle;
  }
}

function toPlayerPokemon(pokemon: BattlePokemon): PlayerPokemon {
  return {
    speciesId: pokemon.speciesId,
    name: pokemon.name,
    level: pokemon.level,
    maxHp: pokemon.maxHp,
    currentHp: pokemon.currentHp,
    experience: pokemon.experience,
    growthRate: pokemon.growthRate,
    status: pokemon.status,
    individualValues: { ...pokemon.individualValues },
    moves: pokemon.moves.map(move => ({
      id: move.id,
      name: move.name,
      pp: move.pp,
      maxPp: move.maxPp,
    })),
  };
}

function resolvePreviousBattleLevel({
  activePartySlotIndex,
  fallbackLevelsGained,
  pokemon,
  previousLevel,
  slotIndex,
}: {
  activePartySlotIndex: number;
  fallbackLevelsGained: number;
  pokemon: BattlePokemon;
  previousLevel?: number;
  slotIndex: number;
}): number {
  if (typeof previousLevel === "number" && Number.isFinite(previousLevel)) {
    return previousLevel;
  }

  if (slotIndex === activePartySlotIndex && fallbackLevelsGained > 0) {
    return Math.max(1, pokemon.level - fallbackLevelsGained);
  }

  return pokemon.level;
}

function applyEvolutionAfterLevelUp({
  evolutionTable,
  personalRecords,
  pokemon,
  previousLevel,
}: {
  evolutionTable: PokemonEvolutionTable;
  personalRecords: RomPersonalRecordCollection;
  pokemon: BattlePokemon;
  previousLevel: number;
}): ReturnType<typeof applyLevelUpEvolution> {
  return applyLevelUpEvolution({
    evolutionTable,
    personalRecords,
    pokemon,
    previousLevel,
  });
}

function insertMessagesBeforeBattleEndConfirm(
  messageQueue: string[],
  messages: string[],
): string[] {
  const confirmMessageIndex = messageQueue.lastIndexOf(BATTLE_END_CONFIRM_MESSAGE);

  if (confirmMessageIndex === -1) {
    return [...messageQueue, ...messages];
  }

  return [
    ...messageQueue.slice(0, confirmMessageIndex),
    ...messages,
    ...messageQueue.slice(confirmMessageIndex),
  ];
}

function isRomRefinedMoveCollection(value: unknown): value is RomRefinedMoveCollection {
  return isRecord(value) && "moves" in value;
}

function isRomPersonalRecordCollection(value: unknown): value is RomPersonalRecordCollection {
  return isRecord(value) && Array.isArray(value.records);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLocalE2eBattleProbeEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname, search } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";

  return isLocalHost && new URLSearchParams(search).has("e2eBattle");
}

function createBattleScenarioStateForTest(scenario: BattleE2eScenario): BattleScreenState {
  const baseState = createSampleBattleState();
  const playerPokemon = cloneBattlePokemon(baseState.player.pokemon);
  const opponentPokemon = cloneBattlePokemon(baseState.opponent.pokemon);

  if (scenario === "wild-victory" || scenario === "wild-evolution") {
    playerPokemon.speed = Math.max(playerPokemon.speed, opponentPokemon.speed + 1);
    playerPokemon.moves = playerPokemon.moves.map((move, index) =>
      index === 0 ? { ...move, accuracy: 100 } : move,
    );
    opponentPokemon.currentHp = 1;
    opponentPokemon.status = "normal";
    if (scenario === "wild-evolution") {
      playerPokemon.speciesId = 152;
      playerPokemon.name = "치코리타";
      playerPokemon.level = 15;
      opponentPokemon.baseExpYield = 500;
    }
  } else {
    playerPokemon.currentHp = 1;
    playerPokemon.status = "normal";
    playerPokemon.speed = Math.min(playerPokemon.speed, Math.max(0, opponentPokemon.speed - 1));
    opponentPokemon.speed = Math.max(opponentPokemon.speed, playerPokemon.speed + 1);
  }

  return {
    ...baseState,
    battleKind: "wild",
    phase: "command",
    messageQueue: [],
    selectedMoveId: null,
    result: null,
    returnToWorld: {
      mapKey: "town",
      x: 687,
      y: 1151,
      facing: "front",
    },
    player: updateBattleParticipantPokemon(baseState.player, playerPokemon),
    opponent: {
      ...updateBattleParticipantPokemon(baseState.opponent, opponentPokemon),
      playerId: "wild",
      displayName: `야생 ${opponentPokemon.name}`,
    },
  };
}

function cloneBattlePokemon(pokemon: BattlePokemon): BattlePokemon {
  return {
    ...pokemon,
    moves: pokemon.moves.map(move => ({ ...move })),
    frontSprite: { ...pokemon.frontSprite },
    backSprite: { ...pokemon.backSprite },
    baseStats: { ...pokemon.baseStats },
    individualValues: { ...pokemon.individualValues },
  };
}

function updateBattleParticipantPokemon(
  participant: BattleParticipant,
  pokemon: BattlePokemon,
): BattleParticipant {
  return {
    ...participant,
    pokemon,
    party: participant.party.map(slot =>
      slot.slotIndex === participant.activePartySlotIndex
        ? { ...slot, pokemon }
        : {
            ...slot,
            pokemon: slot.pokemon ? cloneBattlePokemon(slot.pokemon) : null,
          },
    ),
  };
}

function createBattleHitEffects(): BattleHitEffects {
  return {
    opponent: {
      progress: 0,
      startedCount: 0,
      tween: null,
    },
    player: {
      progress: 0,
      startedCount: 0,
      tween: null,
    },
  };
}
