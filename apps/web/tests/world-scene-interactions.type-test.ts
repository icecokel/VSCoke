import type {
  WorldSceneInteractions,
  WorldSceneInteractionsController,
  WorldSceneInteractionsDependencies,
  WorldSceneInteractionsTestFacade,
  WorldScenePlayerPosition,
} from "../src/components/poke-lounge/runtime/game/scenes/world-scene-interactions";
import type {
  WorldSceneHud,
  WorldSceneHudDependencies,
} from "../src/components/poke-lounge/runtime/game/scenes/world-scene-hud";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

type ExpectedProductionKeys = "destroy" | "getE2eSnapshot" | "handleInput";

type ExpectedControllerKeys =
  | "canOpenPokemonStatusPanel"
  | "createStaticNpcs"
  | "destroy"
  | "getE2eSnapshot"
  | "handleInput"
  | "showInitialShortcutGuideIfNeeded"
  | "test";

type ExpectedDependencyKeys =
  | "closePokemonStatusPanel"
  | "createStaticGroup"
  | "ensureCursorKeys"
  | "gameStateStore"
  | "getGameObjectFactory"
  | "getInputPlugin"
  | "getPartyPokemonBySlotIndex"
  | "getPlayerPosition"
  | "getPokemonStatusPanelSnapshot"
  | "getViewportSize"
  | "isBattleIntroPlaying"
  | "isPokemonStatusPanelOpen"
  | "registerStaticNpcs"
  | "renderPartyHud";

type ExpectedHudKeys = "destroy" | "render" | "updateRound";

type ExpectedHudDependencyKeys =
  | "addUnsubscriber"
  | "canOpenPokemonStatusPanel"
  | "competitiveRoundsEnabled"
  | "gameStateStore"
  | "getGameObjectFactory"
  | "getViewportSize"
  | "isShutdownComplete";

export type WorldSceneInteractionsProductionBoundary = Expect<
  Equal<keyof WorldSceneInteractions, ExpectedProductionKeys>
>;

export type WorldSceneInteractionsControllerBoundary = Expect<
  Equal<keyof WorldSceneInteractionsController, ExpectedControllerKeys>
>;

export type WorldSceneInteractionsDependencyBoundary = Expect<
  Equal<keyof WorldSceneInteractionsDependencies, ExpectedDependencyKeys>
>;

export type WorldSceneInteractionsReadonlyTestFacade = Expect<
  Equal<WorldSceneInteractionsController["test"], Readonly<WorldSceneInteractionsTestFacade>>
>;

export type WorldSceneInteractionsReadonlyPlayerPosition = Expect<
  Equal<
    ReturnType<WorldSceneInteractionsDependencies["getPlayerPosition"]>,
    WorldScenePlayerPosition | null
  >
>;

export type WorldSceneHudBoundary = Expect<Equal<keyof WorldSceneHud, ExpectedHudKeys>>;

export type WorldSceneHudDependencyBoundary = Expect<
  Equal<keyof WorldSceneHudDependencies, ExpectedHudDependencyKeys>
>;
