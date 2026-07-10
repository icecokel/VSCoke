import * as Phaser from "phaser";
import { consumeVirtualGamepadPress } from "../input/virtualGamepad";
import {
  DEFAULT_PREPARATION_DURATION_MS,
  formatRoundTimer,
  getRoundRemainingMs,
} from "../round/roundState";
import type {
  GameStateStore,
  PlayerCompetitiveStats,
  PlayerPokemon,
} from "../state/gameStateStore";
import { createGameTextStyle } from "../ui/gameTextStyle";
import {
  createPartyHudSlotViews,
  PARTY_HUD_SLOT_SIZE,
  type PartyHudSlotView,
} from "../ui/partyHud";

const POKEMON_STATUS_PANEL_SIZE = { width: 216, height: 142 } as const;
const POKEMON_STATUS_PANEL_GAP = 8;

export interface WorldSceneHud {
  render(): void;
  destroy(): void;
  updateRound(nowMs: number): void;
}

export interface PokemonStatusPanelSnapshot {
  slotIndex: number;
  name: string;
  level: number;
  currentHp: number | null;
  maxHp: number | null;
  status: NonNullable<PlayerPokemon["status"]>;
}

export interface WorldSceneHudDependencies {
  scene: Phaser.Scene;
  gameStateStore: GameStateStore;
  competitiveRoundsEnabled: boolean;
  addUnsubscriber(unsubscribe: () => void): void;
  canOpenPokemonStatusPanel(): boolean;
  getViewportSize(): { width: number; height: number };
  isShutdownComplete(): boolean;
}

export interface WorldSceneHudController extends WorldSceneHud {
  closePokemonStatusPanel(options?: { rerenderPartyHud?: boolean }): void;
  createCurrencyHud(): void;
  createPartyHud(): void;
  createRankScoreHud(): void;
  createRoundHud(nowMs: number, preparationDurationMs?: number): void;
  destroyPartyHud(): void;
  getPartyPokemonBySlotIndex(slotIndex: number): PlayerPokemon | null;
  getPokemonStatusPanelSnapshot(): PokemonStatusPanelSnapshot | null;
  isPokemonStatusPanelOpen(): boolean;
}

export function createWorldSceneHud(
  dependencies: WorldSceneHudDependencies,
): WorldSceneHudController {
  return new DefaultWorldSceneHud(dependencies);
}

class DefaultWorldSceneHud implements WorldSceneHudController {
  private currencyHudText: Phaser.GameObjects.Text | null = null;
  private rankScoreHudText: Phaser.GameObjects.Text | null = null;
  private roundHudText: Phaser.GameObjects.Text | null = null;
  private lastRenderedRoundHudText = "";
  private partyHudObjects: Phaser.GameObjects.GameObject[] = [];
  private partyHudSubscribed = false;
  private pokemonStatusPanelSlotIndex: number | null = null;
  private pokemonStatusPanelObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly dependencies: WorldSceneHudDependencies) {}

  createCurrencyHud(): void {
    const { gameStateStore, scene } = this.dependencies;

    this.currencyHudText = scene.add
      .text(
        12,
        10,
        formatPokeDollars(gameStateStore.getCurrentLocalPlayer().wallet.pokeDollars),
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

    this.dependencies.addUnsubscriber(
      gameStateStore.subscribe(state => {
        const currentPlayer = state.playersById[state.currentPlayerId];

        this.currencyHudText?.setText(formatPokeDollars(currentPlayer?.wallet.pokeDollars ?? 0));
      }),
    );
  }

  createRankScoreHud(): void {
    const { gameStateStore, scene } = this.dependencies;

    this.rankScoreHudText = scene.add
      .text(
        this.dependencies.getViewportSize().width - 12,
        10,
        formatRankScoreHud(gameStateStore.getCurrentLocalPlayer().competitive),
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

    this.dependencies.addUnsubscriber(
      gameStateStore.subscribe(state => {
        const currentPlayer = state.playersById[state.currentPlayerId];

        this.rankScoreHudText?.setText(
          formatRankScoreHud(currentPlayer?.competitive ?? { rank: null, score: 0 }),
        );
      }),
    );
  }

  createRoundHud(nowMs: number, preparationDurationMs = DEFAULT_PREPARATION_DURATION_MS): void {
    const { gameStateStore, scene } = this.dependencies;

    if (gameStateStore.getState().round.phase === "waiting") {
      gameStateStore.startPreparationRound(nowMs, preparationDurationMs);
    }

    const hudText = this.formatRoundHudText(nowMs);
    this.roundHudText = scene.add
      .text(
        Math.round(this.dependencies.getViewportSize().width / 2),
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
  }

  updateRound(nowMs: number): void {
    if (!this.dependencies.competitiveRoundsEnabled) {
      return;
    }

    this.dependencies.gameStateStore.advanceRoundClock(nowMs);
    const nextText = this.formatRoundHudText(nowMs);

    if (nextText !== this.lastRenderedRoundHudText) {
      this.roundHudText?.setText(nextText);
      this.lastRenderedRoundHudText = nextText;
    }
  }

  private formatRoundHudText(nowMs: number): string {
    const round = this.dependencies.gameStateStore.getState().round;
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

  createPartyHud(): void {
    this.render();

    if (this.partyHudSubscribed) {
      return;
    }

    this.partyHudSubscribed = true;
    this.dependencies.addUnsubscriber(
      this.dependencies.gameStateStore.subscribe(() => {
        this.render();
      }),
    );
  }

  render(): void {
    this.partyHudObjects.forEach(object => object.destroy());
    this.partyHudObjects = [];

    const localPlayer = this.dependencies.gameStateStore.getCurrentLocalPlayer();
    const slots = createPartyHudSlotViews({
      activePartySlotIndex: localPlayer.activePartySlotIndex,
      anchor: "middle-left",
      party: localPlayer.party,
      screenSize: this.dependencies.getViewportSize(),
    });

    for (const slot of slots) {
      this.renderPartyHudSlot(slot);
    }

    this.renderPokemonStatusPanel();
  }

  private renderPartyHudSlot(slot: PartyHudSlotView): void {
    const { scene } = this.dependencies;
    const background = scene.add
      .rectangle(
        slot.x,
        slot.y,
        PARTY_HUD_SLOT_SIZE.width,
        PARTY_HUD_SLOT_SIZE.height,
        this.pokemonStatusPanelSlotIndex === slot.slotIndex || slot.active ? 0xfff4a3 : 0xf8fbf0,
        0.88,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(900);
    background.setStrokeStyle(
      this.pokemonStatusPanelSlotIndex === slot.slotIndex ? 2 : 1,
      this.pokemonStatusPanelSlotIndex === slot.slotIndex
        ? 0x101820
        : slot.active
          ? 0x355c7d
          : 0x263238,
      0.95,
    );
    this.partyHudObjects.push(background);
    if (slot.occupied) {
      const hitZone = scene.add
        .zone(slot.x, slot.y, PARTY_HUD_SLOT_SIZE.width, PARTY_HUD_SLOT_SIZE.height)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(904)
        .setInteractive({ useHandCursor: true });
      hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.preventDefault();
        this.openPokemonStatusPanel(slot.slotIndex);
      });
      this.partyHudObjects.push(hitZone);
    }

    if (!slot.pokemon) {
      const emptySlotText = scene.add
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

    const sprite = scene.add
      .image(slot.x + 18, slot.y + 17, slot.pokemon.spriteKey)
      .setOrigin(0.5, 0.5)
      .setCrop(
        slot.pokemon.spriteCrop.x,
        slot.pokemon.spriteCrop.y,
        slot.pokemon.spriteCrop.width,
        slot.pokemon.spriteCrop.height,
      )
      .setDisplaySize(28, 28)
      .setScrollFactor(0)
      .setDepth(902);
    const name = scene.add
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
    const level = scene.add
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

  private openPokemonStatusPanel(slotIndex: number): void {
    if (!this.dependencies.canOpenPokemonStatusPanel()) {
      return;
    }

    if (!this.getPartyPokemonBySlotIndex(slotIndex)) {
      return;
    }

    this.pokemonStatusPanelSlotIndex = slotIndex;
    this.render();
  }

  closePokemonStatusPanel(options: { rerenderPartyHud?: boolean } = {}): void {
    const rerenderPartyHud = options.rerenderPartyHud ?? true;

    this.pokemonStatusPanelSlotIndex = null;
    this.destroyPokemonStatusPanelUi();

    if (rerenderPartyHud && !this.dependencies.isShutdownComplete()) {
      this.render();
    }
  }

  isPokemonStatusPanelOpen(): boolean {
    return this.pokemonStatusPanelSlotIndex !== null;
  }

  private renderPokemonStatusPanel(): void {
    this.destroyPokemonStatusPanelUi();

    const slotIndex = this.pokemonStatusPanelSlotIndex;

    if (slotIndex === null) {
      return;
    }

    const localPlayer = this.dependencies.gameStateStore.getCurrentLocalPlayer();
    const slots = createPartyHudSlotViews({
      activePartySlotIndex: localPlayer.activePartySlotIndex,
      anchor: "middle-left",
      party: localPlayer.party,
      screenSize: this.dependencies.getViewportSize(),
    });
    const slot = slots.find(candidate => candidate.slotIndex === slotIndex);
    const pokemon = this.getPartyPokemonBySlotIndex(slotIndex);

    if (!slot || !pokemon || !slot.pokemon) {
      this.pokemonStatusPanelSlotIndex = null;
      return;
    }

    const origin = this.getPokemonStatusPanelOrigin(slot);
    const x = (offset: number) => origin.x + offset;
    const y = (offset: number) => origin.y + offset;
    const { scene } = this.dependencies;
    const panel = scene.add
      .rectangle(
        origin.x,
        origin.y,
        POKEMON_STATUS_PANEL_SIZE.width,
        POKEMON_STATUS_PANEL_SIZE.height,
        0xf8fbf0,
        0.97,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2140);
    panel.setStrokeStyle(3, 0x263238, 1);
    panel.setInteractive();

    const sprite = scene.add
      .image(x(30), y(48), slot.pokemon.spriteKey)
      .setOrigin(0.5, 0.5)
      .setCrop(
        slot.pokemon.spriteCrop.x,
        slot.pokemon.spriteCrop.y,
        slot.pokemon.spriteCrop.width,
        slot.pokemon.spriteCrop.height,
      )
      .setDisplaySize(42, 42)
      .setScrollFactor(0)
      .setDepth(2141);

    this.pokemonStatusPanelObjects.push(
      panel,
      sprite,
      scene.add
        .text(
          x(58),
          y(16),
          slot.pokemon.name,
          createGameTextStyle({
            color: "#263238",
            fontSize: "14px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2141),
      scene.add
        .text(
          x(58),
          y(38),
          `Lv.${slot.pokemon.level}`,
          createGameTextStyle({
            color: "#455a64",
            fontSize: "12px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2141),
      scene.add
        .rectangle(x(14), y(68), POKEMON_STATUS_PANEL_SIZE.width - 28, 2, 0x607d6c, 0.42)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2141),
      scene.add
        .text(
          x(18),
          y(82),
          `HP ${formatPokemonHp(pokemon)}`,
          createGameTextStyle({
            color: "#263238",
            fontSize: "12px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2141),
      scene.add
        .text(
          x(18),
          y(104),
          `상태 ${formatPokemonStatusLabel(pokemon.status ?? "normal")}`,
          createGameTextStyle({
            color: "#263238",
            fontSize: "12px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2141),
      scene.add
        .text(
          x(18),
          y(124),
          "Enter / Backspace 닫기",
          createGameTextStyle({
            color: "#607d6c",
            fontSize: "9px",
          }),
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2141),
    );
  }

  private destroyPokemonStatusPanelUi(): void {
    this.pokemonStatusPanelObjects.forEach(object => object.destroy());
    this.pokemonStatusPanelObjects = [];
  }

  private getPokemonStatusPanelOrigin(slot: PartyHudSlotView): { x: number; y: number } {
    const viewport = this.dependencies.getViewportSize();
    const minMargin = 10;
    const preferredX = slot.x + PARTY_HUD_SLOT_SIZE.width + POKEMON_STATUS_PANEL_GAP;
    const preferredY = slot.y - 6;

    return {
      x: Math.min(
        Math.max(minMargin, preferredX),
        viewport.width - POKEMON_STATUS_PANEL_SIZE.width - minMargin,
      ),
      y: Math.min(
        Math.max(minMargin, preferredY),
        viewport.height - POKEMON_STATUS_PANEL_SIZE.height - minMargin,
      ),
    };
  }

  getPokemonStatusPanelSnapshot(): PokemonStatusPanelSnapshot | null {
    const slotIndex = this.pokemonStatusPanelSlotIndex;

    if (slotIndex === null) {
      return null;
    }

    const pokemon = this.getPartyPokemonBySlotIndex(slotIndex);

    if (!pokemon) {
      return null;
    }

    return {
      slotIndex,
      name: pokemon.name,
      level: pokemon.level,
      currentHp: normalizeOptionalPokemonHp(pokemon.currentHp),
      maxHp: normalizeOptionalPokemonHp(pokemon.maxHp),
      status: pokemon.status ?? "normal",
    };
  }

  getPartyPokemonBySlotIndex(slotIndex: number): PlayerPokemon | null {
    return (
      this.dependencies.gameStateStore
        .getCurrentLocalPlayer()
        .party.find(slot => slot.slotIndex === slotIndex)?.pokemon ?? null
    );
  }

  destroyPartyHud(): void {
    this.partyHudObjects.forEach(object => object.destroy());
    this.partyHudObjects = [];
    this.partyHudSubscribed = false;
  }

  destroy(): void {
    this.destroyPartyHud();
    this.destroyPokemonStatusPanelUi();
    this.roundHudText?.destroy();
    this.roundHudText = null;
    this.lastRenderedRoundHudText = "";
    this.pokemonStatusPanelSlotIndex = null;
  }
}

function normalizeOptionalPokemonHp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : null;
}

export function formatPokemonHp(pokemon: PlayerPokemon): string {
  const currentHp = normalizeOptionalPokemonHp(pokemon.currentHp);
  const maxHp = normalizeOptionalPokemonHp(pokemon.maxHp);

  return currentHp === null || maxHp === null ? "- / -" : `${currentHp} / ${maxHp}`;
}

function formatPokemonStatusLabel(status: PlayerPokemon["status"] | "normal"): string {
  switch (status) {
    case "fainted":
      return "전투불능";
    case "poisoned":
      return "독";
    case "burned":
      return "화상";
    case "paralyzed":
      return "마비";
    case "normal":
    default:
      return "정상";
  }
}

export function formatPokeDollars(pokeDollars: number): string {
  return `₽ ${Math.max(0, Math.floor(pokeDollars)).toLocaleString("en-US")}`;
}

export function formatRankScoreHud({ rank, score }: PlayerCompetitiveStats): string {
  const rankLabel = rank === null ? "-" : rank.toLocaleString("en-US");

  return `Rank ${rankLabel}\nScore ${Math.max(0, Math.floor(score)).toLocaleString("en-US")}`;
}
