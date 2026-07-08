export const POTION_HEAL_AMOUNT = 20;
export const SUPER_POTION_HEAL_AMOUNT = 50;
export const HYPER_POTION_HEAL_AMOUNT = 120;

export type InventoryItemEffectId =
  | "potion"
  | "superPotion"
  | "hyperPotion"
  | "antidote"
  | "revive"
  | "rareCandy";
export type InventoryItemTargetStatus = "normal" | "poisoned" | "burned" | "paralyzed" | "fainted";

export interface InventoryItemTarget {
  name: string;
  level?: number;
  currentHp?: number;
  maxHp?: number;
  status?: InventoryItemTargetStatus;
}

export type ApplyInventoryItemEffectResult<TPokemon extends InventoryItemTarget> =
  | {
      ok: true;
      itemId: InventoryItemEffectId;
      messages: string[];
      pokemon: TPokemon;
    }
  | {
      ok: false;
      itemId: string;
      reason: "unsupported-item" | "no-effect";
      message: string;
    };

export function applyInventoryItemEffect<TPokemon extends InventoryItemTarget>(
  itemId: string,
  pokemon: TPokemon,
): ApplyInventoryItemEffectResult<TPokemon> {
  if (itemId === "potion") {
    return applyHealingItem({
      pokemon,
      itemId: "potion",
      displayName: "포션",
      healAmount: POTION_HEAL_AMOUNT,
    });
  }

  if (itemId === "superPotion") {
    return applyHealingItem({
      pokemon,
      itemId: "superPotion",
      displayName: "좋은상처약",
      healAmount: SUPER_POTION_HEAL_AMOUNT,
    });
  }

  if (itemId === "hyperPotion") {
    return applyHealingItem({
      pokemon,
      itemId: "hyperPotion",
      displayName: "고급상처약",
      healAmount: HYPER_POTION_HEAL_AMOUNT,
    });
  }

  if (itemId === "antidote") {
    return applyAntidote(pokemon);
  }

  if (itemId === "revive") {
    return applyRevive(pokemon);
  }

  if (itemId === "rareCandy") {
    return applyRareCandy(pokemon);
  }

  return {
    ok: false,
    itemId,
    reason: "unsupported-item",
    message: "지금은 쓸 수 없다.",
  };
}

function applyHealingItem<TPokemon extends InventoryItemTarget>({
  pokemon,
  itemId,
  displayName,
  healAmount,
}: {
  pokemon: TPokemon;
  itemId: Extract<InventoryItemEffectId, "potion" | "superPotion" | "hyperPotion">;
  displayName: string;
  healAmount: number;
}): ApplyInventoryItemEffectResult<TPokemon> {
  const maxHp = normalizeHp(pokemon.maxHp);
  const currentHp = normalizeHp(pokemon.currentHp);

  if (maxHp === null || currentHp === null) {
    return {
      ok: false,
      itemId,
      reason: "no-effect",
      message: "효과가 없다.",
    };
  }

  if (pokemon.status === "fainted" || currentHp <= 0) {
    return {
      ok: false,
      itemId,
      reason: "no-effect",
      message: "쓰러진 포켓몬에게는 사용할 수 없다.",
    };
  }

  if (currentHp >= maxHp) {
    return {
      ok: false,
      itemId,
      reason: "no-effect",
      message: "효과가 없다.",
    };
  }

  return {
    ok: true,
    itemId,
    messages: [
      `${pokemon.name}에게 ${displayName}을 사용했다!`,
      `${pokemon.name}의 HP가 회복됐다!`,
    ],
    pokemon: {
      ...pokemon,
      currentHp: Math.min(maxHp, currentHp + healAmount),
      status: pokemon.status ?? "normal",
    },
  };
}

function applyRevive<TPokemon extends InventoryItemTarget>(
  pokemon: TPokemon,
): ApplyInventoryItemEffectResult<TPokemon> {
  const maxHp = normalizeHp(pokemon.maxHp);
  const currentHp = normalizeHp(pokemon.currentHp);

  if (maxHp === null || (pokemon.status !== "fainted" && currentHp !== 0)) {
    return {
      ok: false,
      itemId: "revive",
      reason: "no-effect",
      message: "효과가 없다.",
    };
  }

  return {
    ok: true,
    itemId: "revive",
    messages: [`${pokemon.name}에게 기력의조각을 사용했다!`, `${pokemon.name}는 다시 일어났다!`],
    pokemon: {
      ...pokemon,
      currentHp: Math.max(1, Math.floor(maxHp / 2)),
      status: "normal",
    },
  };
}

function applyRareCandy<TPokemon extends InventoryItemTarget>(
  pokemon: TPokemon,
): ApplyInventoryItemEffectResult<TPokemon> {
  const level = normalizeLevel(pokemon.level);

  if (level === null || level >= 100) {
    return {
      ok: false,
      itemId: "rareCandy",
      reason: "no-effect",
      message: "효과가 없다.",
    };
  }

  return {
    ok: true,
    itemId: "rareCandy",
    messages: [`${pokemon.name}에게 이상한사탕을 사용했다!`, `${pokemon.name}의 레벨이 올랐다!`],
    pokemon: {
      ...pokemon,
      level: level + 1,
    },
  };
}

function applyAntidote<TPokemon extends InventoryItemTarget>(
  pokemon: TPokemon,
): ApplyInventoryItemEffectResult<TPokemon> {
  if (pokemon.status !== "poisoned") {
    return {
      ok: false,
      itemId: "antidote",
      reason: "no-effect",
      message: "효과가 없다.",
    };
  }

  return {
    ok: true,
    itemId: "antidote",
    messages: [`${pokemon.name}에게 해독제를 사용했다!`, `${pokemon.name}의 독이 사라졌다!`],
    pokemon: {
      ...pokemon,
      status: "normal",
    },
  };
}

function normalizeHp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeLevel(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}
