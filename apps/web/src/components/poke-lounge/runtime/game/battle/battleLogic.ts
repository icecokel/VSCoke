import type { BattleCommand, BattleMove, BattlePokemon, BattleScreenState } from "./battleTypes";
import { applyInventoryItemEffect } from "../items/inventoryItemEffects";
import { BATTLE_PARTY_SLOT_COUNT, syncActivePartyPokemon } from "./battleParty";
import { calculateWildBattlePokeDollarReward, formatBattlePokeDollars } from "./battleRewards";
import { resolveGen4CaptureAttempt } from "./captureLogic";
import { applyExperienceGain, calculateWildBattleExpGain } from "./experience";
import { calculateGen4Damage, checkGen4Accuracy } from "./gen4BattleMath";
import { calculateGen4BattleStats } from "./gen4PokemonStats";
import { calculateGen4TypeEffectiveness, formatTypeEffectivenessMessage } from "./gen4-type-chart";

export const BATTLE_END_CONFIRM_MESSAGE = "전투가 종료되었다. 확인을 누르면 필드로 돌아간다.";
export const BATTLE_RUN_FAILED_MESSAGE = "도망칠 수 없었다!";
export const ULTRA_BALL_BONUS = 2;

const BATTLE_EFFECT_ITEM_IDS = [
  "potion",
  "superPotion",
  "antidote",
  "hyperPotion",
  "revive",
] as const;

export interface RunChanceInput {
  playerSpeed: number;
  opponentSpeed: number;
  runAttemptCount: number;
}

export interface RunAttemptInput extends RunChanceInput {
  randomByte?: number;
}

export interface RunAttemptResult {
  escaped: boolean;
  chanceByte: number;
  randomByte: number | null;
  nextRunAttemptCount: number;
}

export interface ChooseBattleCommandOptions {
  randomByte?: () => number;
}

export interface ChooseBattleBagItemOptions {
  itemCount?: number;
  captureRandom16?: () => number;
}

export interface ChoosePlayerMoveOptions {
  random?: () => number;
}

export function popBattleMessage(state: BattleScreenState): BattleScreenState {
  if (state.messageQueue.length === 0) {
    return state.phase === "intro" || state.phase === "resolving"
      ? { ...state, phase: state.result ? "ended" : "command" }
      : state;
  }

  const [, ...rest] = state.messageQueue;

  return {
    ...state,
    messageQueue: rest,
    phase:
      rest.length === 0 && (state.phase === "intro" || state.phase === "resolving")
        ? state.result
          ? "ended"
          : "command"
        : state.phase,
  };
}

export function chooseBattleCommand(
  state: BattleScreenState,
  command: BattleCommand,
  options: ChooseBattleCommandOptions = {},
): BattleScreenState {
  if (state.phase !== "command") {
    return state;
  }

  if (command === "run") {
    if (state.battleKind !== "wild") {
      return {
        ...state,
        messageQueue: ["도망칠 수 없다!"],
        result: null,
        usedInventoryItemId: null,
      };
    }

    const runAttempt = resolveRunAttempt({
      playerSpeed: state.player.pokemon.speed,
      opponentSpeed: state.opponent.pokemon.speed,
      runAttemptCount: state.runAttemptCount,
      randomByte: options.randomByte?.(),
    });

    if (!runAttempt.escaped) {
      return resolveFailedRunTurn(state, runAttempt.nextRunAttemptCount);
    }

    return {
      ...state,
      phase: "ended",
      runAttemptCount: runAttempt.nextRunAttemptCount,
      messageQueue: appendBattleEndConfirmMessage(["무사히 도망쳤다!"]),
      usedInventoryItemId: null,
      result: {
        winnerPlayerId: state.player.playerId,
        loserPlayerId: state.opponent.playerId,
        reason: "run",
      },
    };
  }

  if (command === "bag") {
    return {
      ...state,
      phase: "bag-select",
      selectedMoveId: null,
      messageQueue: [],
      result: null,
      usedInventoryItemId: null,
    };
  }

  if (command === "pokemon") {
    return {
      ...state,
      phase: "party-select",
      selectedMoveId: null,
      messageQueue: [],
      result: null,
      usedInventoryItemId: null,
    };
  }

  if (command !== "fight") {
    return {
      ...state,
      messageQueue: ["아직 사용할 수 없다."],
      usedInventoryItemId: null,
    };
  }

  return {
    ...state,
    phase: "move-select",
    messageQueue: [],
    usedInventoryItemId: null,
  };
}

export function chooseBattleBagItem(
  state: BattleScreenState,
  itemId: string,
  options: ChooseBattleBagItemOptions = {},
): BattleScreenState {
  if (state.phase !== "bag-select") {
    return state;
  }

  const itemCount = normalizeInventoryCount(options.itemCount ?? 0);

  if (itemId === "pokeball") {
    return chooseCaptureBallItem(state, itemCount, options, {
      itemId: "pokeball",
      displayName: "몬스터볼",
      ballBonus: 1,
    });
  }

  if (itemId === "ultraBall") {
    return chooseCaptureBallItem(state, itemCount, options, {
      itemId: "ultraBall",
      displayName: "하이퍼볼",
      ballBonus: ULTRA_BALL_BONUS,
    });
  }

  if (!isBattleEffectItemId(itemId)) {
    return {
      ...state,
      messageQueue: ["지금은 쓸 수 없다."],
      result: null,
      usedInventoryItemId: null,
    };
  }

  if (itemCount <= 0) {
    return {
      ...state,
      messageQueue: [`${battleItemDisplayName(itemId)}이 없다!`],
      result: null,
      usedInventoryItemId: null,
    };
  }

  const effect = applyInventoryItemEffect(itemId, state.player.pokemon);

  if (!effect.ok) {
    return {
      ...state,
      messageQueue: [effect.message],
      result: null,
      usedInventoryItemId: null,
    };
  }

  return resolveOpponentTurnAfterPlayerMessages(
    {
      ...state,
      player: syncActivePartyPokemon(state.player, effect.pokemon),
    },
    effect.messages,
    itemId,
  );
}

function chooseCaptureBallItem(
  state: BattleScreenState,
  itemCount: number,
  options: ChooseBattleBagItemOptions,
  ball: CaptureBallConfig,
): BattleScreenState {
  if (state.battleKind !== "wild") {
    return {
      ...state,
      messageQueue: ["트레이너전에서는 사용할 수 없다."],
      result: null,
      usedInventoryItemId: null,
    };
  }

  if (itemCount <= 0) {
    return {
      ...state,
      messageQueue: [`${ball.displayName}이 없다!`],
      result: null,
      usedInventoryItemId: null,
    };
  }

  const captureAttempt = resolveGen4CaptureAttempt({
    maxHp: state.opponent.pokemon.maxHp,
    currentHp: state.opponent.pokemon.currentHp,
    catchRate: state.opponent.pokemon.catchRate,
    ballBonus: ball.ballBonus,
    random16: options.captureRandom16,
  });

  if (captureAttempt.caught) {
    const rewardPokeDollars = calculateWildBattlePokeDollarReward({
      baseExpYield: state.opponent.pokemon.baseExpYield,
      defeatedLevel: state.opponent.pokemon.level,
      outcome: "capture",
    });

    return {
      ...state,
      phase: "ended",
      selectedMoveId: null,
      messageQueue: appendBattleEndConfirmMessage([
        `${ball.displayName}을 던졌다!`,
        `${state.opponent.pokemon.name}을 잡았다!`,
        ...(rewardPokeDollars > 0
          ? [`${formatBattlePokeDollars(rewardPokeDollars)}을 얻었다!`]
          : []),
      ]),
      usedInventoryItemId: ball.itemId,
      result: {
        winnerPlayerId: state.player.playerId,
        loserPlayerId: state.opponent.playerId,
        reason: "capture",
        capturedPokemon: state.opponent.pokemon,
        rewardPokeDollars,
      },
    };
  }

  return resolveFailedCaptureTurn(state, ball);
}

export function choosePartySlot(state: BattleScreenState, slotIndex: number): BattleScreenState {
  if (state.phase !== "party-select") {
    return state;
  }

  if (!isValidBattlePartySlotIndex(slotIndex)) {
    return blockPartySwitch(state, "교체할 수 없다.");
  }

  const partySlot = state.player.party.find(slot => slot.slotIndex === slotIndex);
  const pokemon = partySlot?.pokemon;

  if (!pokemon) {
    return blockPartySwitch(state, "빈 슬롯이다.");
  }

  if (pokemon.status === "fainted") {
    return blockPartySwitch(state, "쓰러진 포켓몬은 나올 수 없다.");
  }

  if (slotIndex === state.player.activePartySlotIndex) {
    return blockPartySwitch(state, "이미 나와 있다.");
  }

  const switchedState: BattleScreenState = {
    ...state,
    player: {
      ...state.player,
      pokemon,
      activePartySlotIndex: slotIndex,
      party: state.player.party.map(slot =>
        slot.slotIndex === slotIndex ? { ...slot, pokemon } : slot,
      ),
    },
  };

  return resolveOpponentTurnAfterPlayerMessages(switchedState, [`${pokemon.name}, 부탁해!`], null);
}

export function calculateRunChanceByte({
  playerSpeed,
  opponentSpeed,
  runAttemptCount,
}: RunChanceInput): number {
  const normalizedPlayerSpeed = Math.max(0, Math.floor(playerSpeed));
  const normalizedOpponentSpeed = Math.max(0, Math.floor(opponentSpeed));

  if (normalizedOpponentSpeed === 0 || normalizedPlayerSpeed >= normalizedOpponentSpeed) {
    return 256;
  }

  const attemptCount = normalizeRunAttemptCount(runAttemptCount);
  const runValue =
    Math.floor((normalizedPlayerSpeed * 128) / normalizedOpponentSpeed) + attemptCount * 30;

  return runValue & 0xff;
}

export function resolveRunAttempt({
  playerSpeed,
  opponentSpeed,
  runAttemptCount,
  randomByte,
}: RunAttemptInput): RunAttemptResult {
  const attemptCount = normalizeRunAttemptCount(runAttemptCount);
  const chanceByte = calculateRunChanceByte({
    playerSpeed,
    opponentSpeed,
    runAttemptCount: attemptCount,
  });
  const nextRunAttemptCount = attemptCount + 1;

  if (chanceByte >= 256) {
    return {
      escaped: true,
      chanceByte,
      randomByte: null,
      nextRunAttemptCount,
    };
  }

  const normalizedRandomByte = normalizeRunRandomByte(randomByte ?? Math.random() * 256);

  return {
    escaped: chanceByte > normalizedRandomByte,
    chanceByte,
    randomByte: normalizedRandomByte,
    nextRunAttemptCount,
  };
}

export function choosePlayerMove(
  state: BattleScreenState,
  moveIndex: number,
  options: ChoosePlayerMoveOptions = {},
): BattleScreenState {
  if (state.phase !== "move-select") {
    return state;
  }

  const random = options.random ?? Math.random;
  const playerMove = state.player.pokemon.moves[moveIndex];

  if (!playerMove || playerMove.pp <= 0) {
    return {
      ...state,
      messageQueue: ["그 기술은 사용할 수 없다."],
    };
  }

  const opponentMove = randomUsableMove(state.opponent.pokemon.moves, random);
  const actions = orderTurnActions(
    state.player.pokemon,
    playerMove,
    state.opponent.pokemon,
    opponentMove,
    random,
  );
  let playerPokemon = state.player.pokemon;
  let opponentPokemon = state.opponent.pokemon;
  const messageQueue: string[] = [];

  for (const action of actions) {
    if (action.side === "player") {
      playerPokemon = {
        ...playerPokemon,
        moves: spendMovePp(playerPokemon.moves, action.move.id),
      };
      messageQueue.push(`${playerPokemon.name}의 ${action.move.name}!`);
      const moveOutcome = resolveMoveOutcome(playerPokemon, opponentPokemon, action.move, random);
      messageQueue.push(...moveOutcome.messages);
      opponentPokemon = applyDamage(opponentPokemon, moveOutcome.damage);

      if (opponentPokemon.status === "fainted") {
        const wildVictoryExperience =
          state.battleKind === "wild"
            ? applyWildVictoryExperience(playerPokemon, opponentPokemon)
            : null;
        const wildVictoryRewardPokeDollars =
          state.battleKind === "wild"
            ? calculateWildBattlePokeDollarReward({
                baseExpYield: opponentPokemon.baseExpYield,
                defeatedLevel: opponentPokemon.level,
                outcome: "faint",
              })
            : 0;
        const resolvedPlayerPokemon = wildVictoryExperience?.pokemon ?? playerPokemon;
        const victoryMessages = wildVictoryExperience
          ? [
              ...messageQueue,
              "상대 포켓몬은 쓰러졌다!",
              `${withTopicParticle(resolvedPlayerPokemon.name)} ${wildVictoryExperience.experienceGained} 경험치를 얻었다!`,
              ...(wildVictoryExperience.levelsGained > 0
                ? [
                    `${withTopicParticle(resolvedPlayerPokemon.name)} Lv.${resolvedPlayerPokemon.level}이 되었다!`,
                  ]
                : []),
              ...(wildVictoryRewardPokeDollars > 0
                ? [`${formatBattlePokeDollars(wildVictoryRewardPokeDollars)}을 얻었다!`]
                : []),
              "승리했다!",
            ]
          : [...messageQueue, "상대 포켓몬은 쓰러졌다!", "승리했다!"];

        return {
          ...state,
          phase: "ended",
          selectedMoveId: playerMove.id,
          turn: state.turn + 1,
          player: syncActivePartyPokemon(state.player, resolvedPlayerPokemon),
          opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
          usedInventoryItemId: null,
          messageQueue: appendBattleEndConfirmMessage(victoryMessages),
          result: {
            winnerPlayerId: state.player.playerId,
            loserPlayerId: state.opponent.playerId,
            reason: "faint",
            ...(wildVictoryExperience
              ? {
                  experienceGained: wildVictoryExperience.experienceGained,
                  levelsGained: wildVictoryExperience.levelsGained,
                  rewardPokeDollars: wildVictoryRewardPokeDollars,
                }
              : {}),
          },
        };
      }

      continue;
    }

    opponentPokemon = {
      ...opponentPokemon,
      moves: spendMovePp(opponentPokemon.moves, action.move.id),
    };
    messageQueue.push(`${opponentPokemon.name}의 ${action.move.name}!`);
    const moveOutcome = resolveMoveOutcome(opponentPokemon, playerPokemon, action.move, random);
    messageQueue.push(...moveOutcome.messages);
    playerPokemon = applyDamage(playerPokemon, moveOutcome.damage);

    if (playerPokemon.status === "fainted") {
      return {
        ...state,
        phase: "ended",
        selectedMoveId: playerMove.id,
        turn: state.turn + 1,
        player: syncActivePartyPokemon(state.player, playerPokemon),
        opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
        usedInventoryItemId: null,
        messageQueue: appendBattleEndConfirmMessage([
          ...messageQueue,
          "치코리타는 쓰러졌다!",
          "패배했다!",
        ]),
        result: {
          winnerPlayerId: state.opponent.playerId,
          loserPlayerId: state.player.playerId,
          reason: "faint",
        },
      };
    }
  }

  return {
    ...state,
    phase: "resolving",
    selectedMoveId: playerMove.id,
    turn: state.turn + 1,
    player: syncActivePartyPokemon(state.player, playerPokemon),
    opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
    messageQueue,
    usedInventoryItemId: null,
  };
}

function resolveFailedRunTurn(
  state: BattleScreenState,
  runAttemptCount: number,
): BattleScreenState {
  const opponentMove = randomUsableMove(state.opponent.pokemon.moves);

  if (!opponentMove) {
    return {
      ...state,
      phase: "resolving",
      turn: state.turn + 1,
      runAttemptCount,
      selectedMoveId: null,
      messageQueue: [BATTLE_RUN_FAILED_MESSAGE],
      usedInventoryItemId: null,
      result: null,
    };
  }

  let playerPokemon = state.player.pokemon;
  const opponentPokemon = {
    ...state.opponent.pokemon,
    moves: spendMovePp(state.opponent.pokemon.moves, opponentMove.id),
  };
  const messageQueue = [
    BATTLE_RUN_FAILED_MESSAGE,
    `${opponentPokemon.name}의 ${opponentMove.name}!`,
  ];
  const moveOutcome = resolveMoveOutcome(opponentPokemon, playerPokemon, opponentMove);

  messageQueue.push(...moveOutcome.messages);
  playerPokemon = applyDamage(playerPokemon, moveOutcome.damage);

  if (playerPokemon.status === "fainted") {
    return {
      ...state,
      phase: "ended",
      selectedMoveId: null,
      turn: state.turn + 1,
      runAttemptCount,
      player: syncActivePartyPokemon(state.player, playerPokemon),
      opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
      usedInventoryItemId: null,
      messageQueue: appendBattleEndConfirmMessage([
        ...messageQueue,
        `${playerPokemon.name}는 쓰러졌다!`,
        "패배했다!",
      ]),
      result: {
        winnerPlayerId: state.opponent.playerId,
        loserPlayerId: state.player.playerId,
        reason: "faint",
      },
    };
  }

  return {
    ...state,
    phase: "resolving",
    selectedMoveId: null,
    turn: state.turn + 1,
    runAttemptCount,
    player: syncActivePartyPokemon(state.player, playerPokemon),
    opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
    messageQueue,
    usedInventoryItemId: null,
    result: null,
  };
}

function resolveFailedCaptureTurn(
  state: BattleScreenState,
  ball: CaptureBallConfig,
): BattleScreenState {
  const opponentMove = randomUsableMove(state.opponent.pokemon.moves);
  const captureMessages = [
    `${ball.displayName}을 던졌다!`,
    `${state.opponent.pokemon.name}이 볼에서 나왔다!`,
  ];

  if (!opponentMove) {
    return {
      ...state,
      phase: "resolving",
      selectedMoveId: null,
      turn: state.turn + 1,
      messageQueue: captureMessages,
      usedInventoryItemId: ball.itemId,
      result: null,
    };
  }

  const opponentPokemon = {
    ...state.opponent.pokemon,
    moves: spendMovePp(state.opponent.pokemon.moves, opponentMove.id),
  };
  let playerPokemon = state.player.pokemon;
  const messageQueue = [...captureMessages, `${opponentPokemon.name}의 ${opponentMove.name}!`];
  const moveOutcome = resolveMoveOutcome(opponentPokemon, playerPokemon, opponentMove);

  messageQueue.push(...moveOutcome.messages);
  playerPokemon = applyDamage(playerPokemon, moveOutcome.damage);

  if (playerPokemon.status === "fainted") {
    return {
      ...state,
      phase: "ended",
      selectedMoveId: null,
      turn: state.turn + 1,
      player: syncActivePartyPokemon(state.player, playerPokemon),
      opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
      messageQueue: appendBattleEndConfirmMessage([
        ...messageQueue,
        `${playerPokemon.name}는 쓰러졌다!`,
        "패배했다!",
      ]),
      usedInventoryItemId: ball.itemId,
      result: {
        winnerPlayerId: state.opponent.playerId,
        loserPlayerId: state.player.playerId,
        reason: "faint",
      },
    };
  }

  return {
    ...state,
    phase: "resolving",
    selectedMoveId: null,
    turn: state.turn + 1,
    player: syncActivePartyPokemon(state.player, playerPokemon),
    opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
    messageQueue,
    usedInventoryItemId: ball.itemId,
    result: null,
  };
}

function resolveOpponentTurnAfterPlayerMessages(
  state: BattleScreenState,
  startingMessages: string[],
  usedInventoryItemId: string | null,
): BattleScreenState {
  const opponentMove = randomUsableMove(state.opponent.pokemon.moves);

  if (!opponentMove) {
    return {
      ...state,
      phase: "resolving",
      selectedMoveId: null,
      turn: state.turn + 1,
      messageQueue: startingMessages,
      usedInventoryItemId,
      result: null,
    };
  }

  const opponentPokemon = {
    ...state.opponent.pokemon,
    moves: spendMovePp(state.opponent.pokemon.moves, opponentMove.id),
  };
  let playerPokemon = state.player.pokemon;
  const messageQueue = [...startingMessages, `${opponentPokemon.name}의 ${opponentMove.name}!`];
  const moveOutcome = resolveMoveOutcome(opponentPokemon, playerPokemon, opponentMove);

  messageQueue.push(...moveOutcome.messages);
  playerPokemon = applyDamage(playerPokemon, moveOutcome.damage);

  if (playerPokemon.status === "fainted") {
    return {
      ...state,
      phase: "ended",
      selectedMoveId: null,
      turn: state.turn + 1,
      player: syncActivePartyPokemon(state.player, playerPokemon),
      opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
      messageQueue: appendBattleEndConfirmMessage([
        ...messageQueue,
        `${playerPokemon.name}는 쓰러졌다!`,
        "패배했다!",
      ]),
      usedInventoryItemId,
      result: {
        winnerPlayerId: state.opponent.playerId,
        loserPlayerId: state.player.playerId,
        reason: "faint",
      },
    };
  }

  return {
    ...state,
    phase: "resolving",
    selectedMoveId: null,
    turn: state.turn + 1,
    player: syncActivePartyPokemon(state.player, playerPokemon),
    opponent: syncActivePartyPokemon(state.opponent, opponentPokemon),
    messageQueue,
    usedInventoryItemId,
    result: null,
  };
}

function blockPartySwitch(state: BattleScreenState, message: string): BattleScreenState {
  return {
    ...state,
    phase: "party-select",
    selectedMoveId: null,
    messageQueue: [message],
    usedInventoryItemId: null,
    result: null,
  };
}

function appendBattleEndConfirmMessage(messages: string[]): string[] {
  return [...messages, BATTLE_END_CONFIRM_MESSAGE];
}

function withTopicParticle(name: string): string {
  return `${name}${getTopicParticle(name)}`;
}

function getTopicParticle(name: string): "은" | "는" {
  const lastCharacter = name[name.length - 1];

  if (!lastCharacter) {
    return "는";
  }

  const hangulOffset = lastCharacter.charCodeAt(0) - 0xac00;

  if (hangulOffset < 0 || hangulOffset > 11171) {
    return "는";
  }

  return hangulOffset % 28 === 0 ? "는" : "은";
}

function applyWildVictoryExperience(
  playerPokemon: BattlePokemon,
  defeatedPokemon: BattlePokemon,
): { pokemon: BattlePokemon; experienceGained: number; levelsGained: number } {
  const experienceGained = calculateWildBattleExpGain({
    baseExpYield: defeatedPokemon.baseExpYield,
    defeatedLevel: defeatedPokemon.level,
  });
  const experienceResult = applyExperienceGain({
    currentExperience: playerPokemon.experience,
    currentLevel: playerPokemon.level,
    growthRate: playerPokemon.growthRate,
    gainedExperience: experienceGained,
  });

  if (experienceResult.level === playerPokemon.level) {
    return {
      pokemon: {
        ...playerPokemon,
        experience: experienceResult.experience,
      },
      experienceGained,
      levelsGained: experienceResult.levelsGained,
    };
  }

  const nextStats = calculateGen4BattleStats(
    playerPokemon.baseStats,
    experienceResult.level,
    playerPokemon.individualValues,
  );
  const maxHpIncrease = Math.max(0, nextStats.maxHp - playerPokemon.maxHp);

  return {
    pokemon: {
      ...playerPokemon,
      level: experienceResult.level,
      experience: experienceResult.experience,
      maxHp: nextStats.maxHp,
      currentHp: Math.min(nextStats.maxHp, playerPokemon.currentHp + maxHpIncrease),
      attack: nextStats.attack,
      defense: nextStats.defense,
      specialAttack: nextStats.specialAttack,
      specialDefense: nextStats.specialDefense,
      speed: nextStats.speed,
    },
    experienceGained,
    levelsGained: experienceResult.levelsGained,
  };
}

function normalizeRunAttemptCount(runAttemptCount: number): number {
  return Math.max(0, Math.floor(runAttemptCount));
}

function normalizeRunRandomByte(randomByte: number): number {
  const integer = Number.isFinite(randomByte) ? Math.floor(randomByte) : 0;

  return ((integer % 256) + 256) % 256;
}

function normalizeInventoryCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(0, Math.floor(count));
}

function battleItemDisplayName(itemId: string): string {
  if (itemId === "potion") {
    return "포션";
  }

  if (itemId === "superPotion") {
    return "좋은상처약";
  }

  if (itemId === "pokeball") {
    return "몬스터볼";
  }

  if (itemId === "antidote") {
    return "해독제";
  }

  if (itemId === "hyperPotion") {
    return "고급상처약";
  }

  if (itemId === "revive") {
    return "기력의조각";
  }

  if (itemId === "ultraBall") {
    return "하이퍼볼";
  }

  return "아이템";
}

function isBattleEffectItemId(itemId: string): itemId is (typeof BATTLE_EFFECT_ITEM_IDS)[number] {
  return (BATTLE_EFFECT_ITEM_IDS as readonly string[]).includes(itemId);
}

interface CaptureBallConfig {
  itemId: "pokeball" | "ultraBall";
  displayName: string;
  ballBonus: number;
}

function isValidBattlePartySlotIndex(slotIndex: number): boolean {
  return (
    Number.isFinite(slotIndex) &&
    Number.isInteger(slotIndex) &&
    slotIndex >= 0 &&
    slotIndex < BATTLE_PARTY_SLOT_COUNT
  );
}

type TurnAction = { side: "player"; move: BattleMove } | { side: "opponent"; move: BattleMove };

function orderTurnActions(
  player: BattlePokemon,
  playerMove: BattleMove,
  opponent: BattlePokemon,
  opponentMove: BattleMove | null,
  random: () => number = Math.random,
): TurnAction[] {
  const playerAction: TurnAction = { side: "player", move: playerMove };

  if (!opponentMove) {
    return [playerAction];
  }

  const opponentAction: TurnAction = { side: "opponent", move: opponentMove };
  const playerPriority = getMovePriority(playerMove);
  const opponentPriority = getMovePriority(opponentMove);

  if (opponentPriority !== playerPriority) {
    return opponentPriority > playerPriority
      ? [opponentAction, playerAction]
      : [playerAction, opponentAction];
  }

  if (opponent.speed !== player.speed) {
    return opponent.speed > player.speed
      ? [opponentAction, playerAction]
      : [playerAction, opponentAction];
  }

  return randomUnit(random) < 0.5 ? [playerAction, opponentAction] : [opponentAction, playerAction];
}

function randomUsableMove(
  moves: BattleMove[],
  random: () => number = Math.random,
): BattleMove | null {
  const usableMoves = moves.filter(move => move.pp > 0);

  if (usableMoves.length === 0) {
    return null;
  }

  return usableMoves[Math.floor(randomUnit(random) * usableMoves.length)] ?? usableMoves[0];
}

function spendMovePp(moves: BattleMove[], moveId: number): BattleMove[] {
  return moves.map(move => (move.id === moveId ? { ...move, pp: Math.max(0, move.pp - 1) } : move));
}

interface MoveOutcome {
  damage: number;
  messages: string[];
}

function resolveMoveOutcome(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: BattleMove,
  random: () => number = Math.random,
): MoveOutcome {
  if (!moveHits(move, random)) {
    return {
      damage: 0,
      messages: [`${attacker.name}의 공격은 빗나갔다!`],
    };
  }

  const typeEffectiveness = calculateGen4TypeEffectiveness(move.typeId, defender.typeIds);
  const critical = rollCriticalHit(random);
  const damage = damageForMove(attacker, defender, move, {
    critical,
    randomFactor: rollDamageRandomFactor(random),
    typeEffectiveness,
  });
  const typeMessage =
    move.category !== "status" && move.power > 0
      ? formatTypeEffectivenessMessage(typeEffectiveness)
      : null;
  const messages = [
    ...(critical && damage > 0 ? ["급소에 맞았다!"] : []),
    ...[typeMessage].filter(isString),
  ];

  return { damage, messages };
}

function damageForMove(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: BattleMove,
  modifiers: { critical: boolean; randomFactor: number; typeEffectiveness: number },
): number {
  const offensiveStat = move.category === "special" ? attacker.specialAttack : attacker.attack;
  const defensiveStat = move.category === "special" ? defender.specialDefense : defender.defense;

  return calculateGen4Damage({
    level: attacker.level,
    power: move.power,
    attack: offensiveStat,
    defense: defensiveStat,
    moveTypeId: move.typeId,
    attackerTypeIds: attacker.typeIds,
    typeEffectiveness: modifiers.typeEffectiveness,
    randomFactor: modifiers.randomFactor,
    critical: modifiers.critical,
    category: move.category,
  });
}

function moveHits(move: BattleMove, random: () => number = Math.random): boolean {
  return checkGen4Accuracy({
    accuracy: move.accuracy,
    accuracyStage: 0,
    evasionStage: 0,
    roll: rollAccuracy(random),
  });
}

function getMovePriority(move: BattleMove): number {
  if (move.effectCode === 103) {
    return 1;
  }

  return 0;
}

function rollCriticalHit(random: () => number): boolean {
  return randomUnit(random) < 1 / 16;
}

function rollDamageRandomFactor(random: () => number): number {
  return 85 + Math.floor(randomUnit(random) * 16);
}

function rollAccuracy(random: () => number): number {
  return 1 + Math.floor(randomUnit(random) * 100);
}

function randomUnit(random: () => number): number {
  const value = random();

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(0.999999, value));
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}

function applyDamage(pokemon: BattlePokemon, damage: number): BattlePokemon {
  const currentHp = Math.max(0, pokemon.currentHp - damage);

  return {
    ...pokemon,
    currentHp,
    status: currentHp === 0 ? "fainted" : pokemon.status,
  };
}
