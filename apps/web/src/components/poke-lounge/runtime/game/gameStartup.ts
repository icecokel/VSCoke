export type InitialGameScene = "world" | "battle";
export type InitialBattleE2eScenario = "wild-victory" | "wild-defeat" | "wild-evolution";

export function readInitialGameScene(location: Pick<URL, "searchParams">): InitialGameScene {
  return location.searchParams.get("scene") === "battle" ? "battle" : "world";
}

export function readInitialBattleE2eScenario(
  location: Pick<URL, "searchParams">,
): InitialBattleE2eScenario | null {
  const scenario = location.searchParams.get("e2eBattle");

  return scenario === "wild-victory" || scenario === "wild-defeat" || scenario === "wild-evolution"
    ? scenario
    : null;
}
