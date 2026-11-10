export interface SeaShot {
  hit: boolean;
  sunk: boolean;
}

export type SeaShotLabelKey = "sunk" | "hit" | "miss";

// 미니 해전 사격 결과는 내 바다와 상대 바다에서 같은 기호·라벨로 보여준다.
export const getSeaShotLabelKey = (shot: SeaShot): SeaShotLabelKey =>
  shot.sunk ? "sunk" : shot.hit ? "hit" : "miss";

export const getSeaShotSymbol = (shot: SeaShot): string => (shot.sunk ? "◆" : shot.hit ? "✕" : "·");
