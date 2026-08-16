export type CanonicalCompetitiveAction =
  | { kind: "move"; moveId: number | string }
  | { kind: "switch"; slotIndex: number };
