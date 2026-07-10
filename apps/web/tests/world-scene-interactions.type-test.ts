import type {
  WorldSceneInteractions,
  WorldSceneInteractionsDependencies,
  WorldSceneInteractionsTestFacade,
  WorldScenePlayerPosition,
} from "../src/components/poke-lounge/runtime/game/scenes/world-scene-interactions";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

type ExpectedProductionKeys =
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

export type WorldSceneInteractionsProductionBoundary = Expect<
  Equal<keyof WorldSceneInteractions, ExpectedProductionKeys>
>;

export type WorldSceneInteractionsDependencyBoundary = Expect<
  Equal<keyof WorldSceneInteractionsDependencies, ExpectedDependencyKeys>
>;

export type WorldSceneInteractionsReadonlyTestFacade = Expect<
  Equal<WorldSceneInteractions["test"], Readonly<WorldSceneInteractionsTestFacade>>
>;

export type WorldSceneInteractionsReadonlyPlayerPosition = Expect<
  Equal<
    ReturnType<WorldSceneInteractionsDependencies["getPlayerPosition"]>,
    WorldScenePlayerPosition | null
  >
>;
