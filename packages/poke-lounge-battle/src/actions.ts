export type CanonicalCompetitiveAction =
  | { kind: "move"; moveId: string }
  | { kind: "switch"; slotIndex: number };
