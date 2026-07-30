import assert from "node:assert/strict";
import test from "node:test";
import {
  BATTLE_END_CONFIRM_MESSAGE,
  chooseBattleBagItem,
  chooseBattleCommand,
  choosePartySlot,
  choosePlayerMove,
  formatWildVictoryRewardMessage,
  isForcedPartySwitch,
  popBattleMessage,
} from "./battleLogic";
import { createSampleBattleState } from "./battleSampleState";
import type { BattlePokemon, BattleScreenState } from "./battleTypes";
import { getExperienceForLevel } from "./experience";

test("야생 전투 경험치와 돈 보상은 한 문구로 안내한다", () => {
  assert.equal(
    formatWildVictoryRewardMessage("브케인", 500, 120),
    "브케인은 경험치 500과 ₽ 120을 얻었다!",
  );
  assert.equal(formatWildVictoryRewardMessage("피카츄", 500, 0), "피카츄는 500 경험치를 얻었다!");
});

test("야생 전투 경험치와 레벨은 보상 문구가 표시될 때 적용한다", () => {
  const initialState = createSampleBattleState();
  const playerPokemon = {
    ...clonePokemon(initialState.player.pokemon),
    level: 10,
    experience: getExperienceForLevel(11, initialState.player.pokemon.growthRate) - 1,
    speed: 999,
    moves: initialState.player.pokemon.moves.map((move, index) =>
      index === 0 ? { ...move, accuracy: 100, power: 999 } : move,
    ),
  };
  const opponentPokemon = {
    ...clonePokemon(initialState.opponent.pokemon),
    baseExpYield: 100,
    currentHp: 1,
    status: "normal" as const,
  };
  const battleState: BattleScreenState = {
    ...initialState,
    battleKind: "wild",
    phase: "move-select",
    messageQueue: [],
    player: {
      ...initialState.player,
      pokemon: playerPokemon,
      party: initialState.player.party.map(slot =>
        slot.slotIndex === initialState.player.activePartySlotIndex
          ? { ...slot, pokemon: playerPokemon }
          : slot,
      ),
    },
    opponent: {
      ...initialState.opponent,
      pokemon: opponentPokemon,
      party: initialState.opponent.party.map(slot =>
        slot.slotIndex === initialState.opponent.activePartySlotIndex
          ? { ...slot, pokemon: opponentPokemon }
          : slot,
      ),
    },
  };

  let resolvedState = choosePlayerMove(battleState, 0, { random: () => 0.5 });
  const rewardMessage = resolvedState.pendingExperienceReward?.message;
  const rewardedLevel = resolvedState.pendingExperienceReward?.pokemon.level ?? 10;

  assert.ok(rewardMessage);
  assert.equal(resolvedState.player.pokemon.level, 10);
  assert.ok(rewardedLevel > 10);

  while (resolvedState.messageQueue[0] !== rewardMessage) {
    assert.equal(resolvedState.player.pokemon.level, 10);
    resolvedState = popBattleMessage(resolvedState);
  }

  assert.equal(resolvedState.player.pokemon.level, rewardedLevel);
  assert.equal(resolvedState.pendingExperienceReward, null);
});

test("포획 판정은 애니메이션용 볼 종류와 실제 흔들림 횟수를 보존한다", () => {
  const initialState = createSampleBattleState();
  const bagState: BattleScreenState = {
    ...initialState,
    battleKind: "wild",
    phase: "bag-select",
    messageQueue: [],
  };

  const caughtState = chooseBattleBagItem(bagState, "pokeball", {
    itemCount: 1,
    captureRandom16: () => 0,
  });
  const escapedState = chooseBattleBagItem(bagState, "pokeball", {
    itemCount: 1,
    captureRandom16: () => 65_535,
  });

  assert.deepEqual(caughtState.captureAttempt, {
    ballItemId: "pokeball",
    caught: true,
    shakes: 4,
  });
  assert.deepEqual(escapedState.captureAttempt, {
    ballItemId: "pokeball",
    caught: false,
    shakes: 0,
  });
});

test("기술 우선도가 같으면 스피드가 빠른 포켓몬이 먼저 행동한다", () => {
  const fasterPlayerState = createSpeedOrderBattleState({
    playerSpeed: 100,
    opponentSpeed: 10,
  });
  const fasterOpponentState = createSpeedOrderBattleState({
    playerSpeed: 10,
    opponentSpeed: 100,
  });

  const playerFirstResult = choosePlayerMove(fasterPlayerState, 0, {
    random: () => 0.99,
  });
  const opponentFirstResult = choosePlayerMove(fasterOpponentState, 0, {
    random: () => 0.99,
  });

  assert.equal(playerFirstResult.messageQueue[0], "치코리타의 몸통박치기!");
  assert.deepEqual(playerFirstResult.messageHpSnapshots?.[0], {
    playerCurrentHp: fasterPlayerState.player.pokemon.currentHp,
    opponentCurrentHp: playerFirstResult.opponent.pokemon.currentHp,
  });
  assert.deepEqual(playerFirstResult.messageHpSnapshots?.[1], {
    playerCurrentHp: playerFirstResult.player.pokemon.currentHp,
    opponentCurrentHp: playerFirstResult.opponent.pokemon.currentHp,
  });
  assert.equal(opponentFirstResult.messageQueue[0], "브케인의 몸통박치기!");
  assert.deepEqual(opponentFirstResult.messageHpSnapshots?.[0], {
    playerCurrentHp: opponentFirstResult.player.pokemon.currentHp,
    opponentCurrentHp: fasterOpponentState.opponent.pokemon.currentHp,
  });
  assert.deepEqual(opponentFirstResult.messageHpSnapshots?.[1], {
    playerCurrentHp: opponentFirstResult.player.pokemon.currentHp,
    opponentCurrentHp: opponentFirstResult.opponent.pokemon.currentHp,
  });

  const afterFirstMessage = popBattleMessage(opponentFirstResult);
  assert.equal(afterFirstMessage.messageQueue[0], "치코리타의 몸통박치기!");
  assert.deepEqual(
    afterFirstMessage.messageHpSnapshots?.[0],
    opponentFirstResult.messageHpSnapshots?.[1],
  );
});

test("선두가 쓰러지고 생존한 벤치가 있으면 패배 대신 강제 교체로 진행한다", () => {
  const state = choosePlayerMove(createTwoPokemonBattleState(), 0, {
    random: () => 0.5,
  });

  assert.equal(state.phase, "party-select");
  assert.equal(isForcedPartySwitch(state), true);
  assert.equal(state.turn, 2);
  assert.equal(state.result, null);
  assert.equal(state.player.pokemon.status, "fainted");
  assert.equal(state.player.pokemon.currentHp, 0);
  assert.equal(state.player.party[0]?.pokemon?.status, "fainted");
  assert.equal(
    state.messageQueue.some(message => message === "패배했다!"),
    false,
  );
  assert.equal(state.messageQueue.includes(BATTLE_END_CONFIRM_MESSAGE), false);
  assert.equal(state.messageQueue.at(-1), "교체할 포켓몬을 선택해 주세요.");
});

test("강제 교체는 상대의 추가 공격이나 턴 증가 없이 명령 선택으로 돌아간다", () => {
  const faintState = drainBattleMessages(
    choosePlayerMove(createTwoPokemonBattleState(), 0, {
      random: () => 0.5,
    }),
  );
  const turnBeforeSwitch = faintState.turn;
  const opponentPpBeforeSwitch = faintState.opponent.pokemon.moves[0]?.pp;
  const reserveHpBeforeSwitch = faintState.player.party[1]?.pokemon?.currentHp;
  const switchedState = choosePartySlot(faintState, 1);

  assert.equal(switchedState.phase, "resolving");
  assert.equal(isForcedPartySwitch(switchedState), false);
  assert.equal(switchedState.player.activePartySlotIndex, 1);
  assert.equal(switchedState.player.pokemon.name, "브케인");
  assert.equal(switchedState.turn, turnBeforeSwitch);
  assert.equal(switchedState.opponent.pokemon.moves[0]?.pp, opponentPpBeforeSwitch);
  assert.equal(switchedState.player.pokemon.currentHp, reserveHpBeforeSwitch);
  assert.deepEqual(switchedState.messageQueue, ["브케인, 부탁해!"]);
  assert.equal(popBattleMessage(switchedState).phase, "command");
});

test("교체할 수 있는 포켓몬이 없을 때만 전투 패배로 종료한다", () => {
  const state = createTwoPokemonBattleState();
  state.player.party[1] = { slotIndex: 1, pokemon: null };

  const defeatedState = choosePlayerMove(state, 0, {
    random: () => 0.5,
  });

  assert.equal(defeatedState.phase, "ended");
  assert.equal(defeatedState.result?.winnerPlayerId, state.opponent.playerId);
  assert.equal(defeatedState.result?.reason, "faint");
  assert.equal(defeatedState.messageQueue.includes("패배했다!"), true);
  assert.equal(defeatedState.messageQueue.includes(BATTLE_END_CONFIRM_MESSAGE), true);
});

test("전투 중 자발적 교체는 가능하고 상대 턴을 한 번 소모한다", () => {
  const initialState = createTwoPokemonBattleState({ reserveHp: 999 });
  initialState.phase = "command";
  initialState.player.pokemon = {
    ...initialState.player.pokemon,
    currentHp: initialState.player.pokemon.maxHp,
    status: "normal",
  };
  initialState.player.party[0] = {
    slotIndex: 0,
    pokemon: initialState.player.pokemon,
  };
  const partyState = chooseBattleCommand(initialState, "pokemon");
  const opponentPpBeforeSwitch = partyState.opponent.pokemon.moves[0]?.pp;
  const reserveHpBeforeSwitch = partyState.player.party[1]?.pokemon?.currentHp ?? 0;
  const switchedState = choosePartySlot(partyState, 1);

  assert.equal(partyState.phase, "party-select");
  assert.equal(isForcedPartySwitch(partyState), false);
  assert.equal(switchedState.player.activePartySlotIndex, 1);
  assert.equal(switchedState.turn, initialState.turn + 1);
  assert.equal(switchedState.opponent.pokemon.moves[0]?.pp, (opponentPpBeforeSwitch ?? 0) - 1);
  assert.ok(switchedState.player.pokemon.currentHp < reserveHpBeforeSwitch);
  assert.equal(switchedState.result, null);
});

test("턴 종료 독 피해로 선두가 쓰러져도 생존한 벤치로 교체한다", () => {
  const state = createTwoPokemonBattleState();
  state.player.pokemon = {
    ...state.player.pokemon,
    currentHp: 1,
    speed: 100,
    status: "poisoned",
  };
  state.player.party[0] = { slotIndex: 0, pokemon: state.player.pokemon };
  state.opponent.pokemon = {
    ...state.opponent.pokemon,
    currentHp: state.opponent.pokemon.maxHp,
    moves: [],
    speed: 1,
  };
  state.opponent.party[0] = { slotIndex: 0, pokemon: state.opponent.pokemon };

  const faintState = choosePlayerMove(state, 0, { random: () => 0.5 });

  assert.equal(faintState.phase, "party-select");
  assert.equal(isForcedPartySwitch(faintState), true);
  assert.equal(faintState.player.pokemon.status, "fainted");
  assert.equal(faintState.messageQueue.includes("치코리타는 독 데미지를 입었다!"), true);
  assert.equal(faintState.result, null);
});

function createTwoPokemonBattleState({ reserveHp = 43 } = {}): BattleScreenState {
  const baseState = createSampleBattleState();
  const playerPokemon: BattlePokemon = {
    ...clonePokemon(baseState.player.pokemon),
    currentHp: 1,
    speed: 1,
    status: "normal",
  };
  const reservePokemon: BattlePokemon = {
    ...clonePokemon(baseState.opponent.pokemon),
    currentHp: reserveHp,
    maxHp: Math.max(reserveHp, baseState.opponent.pokemon.maxHp),
    status: "normal",
  };
  const opponentPokemon: BattlePokemon = {
    ...clonePokemon(baseState.opponent.pokemon),
    speed: 100,
    status: "normal",
    moves: [
      {
        ...baseState.opponent.pokemon.moves[0],
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        power: 40,
      },
    ],
  };

  return {
    ...baseState,
    phase: "move-select",
    messageQueue: [],
    player: {
      ...baseState.player,
      pokemon: playerPokemon,
      activePartySlotIndex: 0,
      party: baseState.player.party.map(slot => {
        if (slot.slotIndex === 0) {
          return { ...slot, pokemon: playerPokemon };
        }

        if (slot.slotIndex === 1) {
          return { ...slot, pokemon: reservePokemon };
        }

        return slot;
      }),
    },
    opponent: {
      ...baseState.opponent,
      pokemon: opponentPokemon,
      party: baseState.opponent.party.map(slot =>
        slot.slotIndex === 0 ? { ...slot, pokemon: opponentPokemon } : slot,
      ),
    },
    selectedMoveId: null,
    result: null,
  };
}

function createSpeedOrderBattleState({
  playerSpeed,
  opponentSpeed,
}: {
  playerSpeed: number;
  opponentSpeed: number;
}): BattleScreenState {
  const baseState = createSampleBattleState();
  const tackle = {
    ...baseState.player.pokemon.moves[0],
    id: 33,
    name: "몸통박치기",
    effectCode: 0,
    category: "physical" as const,
    power: 1,
    accuracy: 100,
    pp: 35,
    maxPp: 35,
  };
  const playerPokemon = {
    ...clonePokemon(baseState.player.pokemon),
    speed: playerSpeed,
    moves: [{ ...tackle }],
  };
  const opponentPokemon = {
    ...clonePokemon(baseState.opponent.pokemon),
    speed: opponentSpeed,
    moves: [{ ...tackle }],
  };

  return {
    ...baseState,
    phase: "move-select",
    messageQueue: [],
    player: {
      ...baseState.player,
      pokemon: playerPokemon,
      party: baseState.player.party.map(slot =>
        slot.slotIndex === baseState.player.activePartySlotIndex
          ? { ...slot, pokemon: playerPokemon }
          : slot,
      ),
    },
    opponent: {
      ...baseState.opponent,
      pokemon: opponentPokemon,
      party: baseState.opponent.party.map(slot =>
        slot.slotIndex === baseState.opponent.activePartySlotIndex
          ? { ...slot, pokemon: opponentPokemon }
          : slot,
      ),
    },
    selectedMoveId: null,
    result: null,
  };
}

function clonePokemon(pokemon: BattlePokemon): BattlePokemon {
  return {
    ...pokemon,
    baseStats: { ...pokemon.baseStats },
    individualValues: { ...pokemon.individualValues },
    statStages: { ...pokemon.statStages },
    frontSprite: { ...pokemon.frontSprite },
    backSprite: { ...pokemon.backSprite },
    moves: pokemon.moves.map(move => ({ ...move })),
  };
}

function drainBattleMessages(state: BattleScreenState): BattleScreenState {
  let nextState = state;

  while (nextState.messageQueue.length > 0) {
    nextState = popBattleMessage(nextState);
  }

  return nextState;
}
