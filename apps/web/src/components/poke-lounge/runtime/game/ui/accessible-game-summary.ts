import { findCurrentMatch } from "../network/tournament-projection";
import type { GameState, PlayerPokemon } from "../state/gameStateStore";

export function createAccessibleGameSummary(state: GameState): string {
  const player = state.playersById[state.currentPlayerId];

  if (!player) {
    return "트레이너 정보를 준비하는 중입니다.";
  }

  const activePokemon =
    player.party.find(slot => slot.slotIndex === player.activePartySlotIndex)?.pokemon ??
    player.party.find(slot => slot.pokemon)?.pokemon;
  const partySummary = activePokemon
    ? createPokemonSummary(activePokemon, player.party.filter(slot => slot.pokemon).length)
    : "파티 포켓몬을 선택하지 않았습니다.";
  const projection = state.tournament.serverProjection;

  if (!projection) {
    const modeSummary =
      state.session.roomId && state.session.roomId !== "local-preview"
        ? `방 ${state.session.roomId}, ${formatConnectionStatus(state.session.connectionStatus)}.`
        : "솔로 플레이, 공개 랭킹 미반영.";

    return `${modeSummary} ${partySummary}`;
  }

  const activeMatch = findCurrentMatch(
    projection.tournament.bracket,
    projection.tournament.activeMatchId,
  );
  const ownParticipant = projection.participants.find(
    participant => participant.playerId === projection.ownPlayerId,
  );
  const opponent = activeMatch
    ? [activeMatch.participantA, activeMatch.participantB].find(
        participant => participant.playerId !== projection.ownPlayerId,
      )
    : null;
  const readyParticipants = projection.participants.filter(
    participant => participant.role === "participant" && participant.ready,
  ).length;
  const totalParticipants = projection.participants.filter(
    participant => participant.role === "participant",
  ).length;
  const stageSummary =
    projection.roomStatus === "waiting"
      ? `대기실, 준비 ${readyParticipants}/${totalParticipants}.`
      : projection.roomStatus === "round-started"
        ? "대회 시작 전 준비 중."
        : projection.roomStatus === "completed"
          ? "토너먼트 완료."
          : projection.roomStatus === "closed"
            ? "방 종료."
            : opponent
              ? `현재 상대 ${opponent.displayName}.`
              : "다음 대진 대기 중.";
  const roleSummary = ownParticipant?.role === "spectator" ? "내 상태 관전." : "내 상태 참가.";
  const rankingSummary =
    projection.competitionKind === "ranked-head-to-head"
      ? "공개 랭킹 반영 경기."
      : "공개 랭킹 미반영 경기.";

  return `방 ${projection.roomCode}. ${stageSummary} ${roleSummary} ${rankingSummary} ${partySummary}`;
}

function createPokemonSummary(pokemon: PlayerPokemon, partySize: number): string {
  const hp =
    typeof pokemon.currentHp === "number" && typeof pokemon.maxHp === "number"
      ? `HP ${Math.max(0, pokemon.currentHp)}/${Math.max(0, pokemon.maxHp)}`
      : "HP 정보 없음";
  const status =
    pokemon.status && pokemon.status !== "normal"
      ? `, 상태 ${formatPokemonStatus(pokemon.status)}`
      : "";
  const moves = pokemon.moves?.length
    ? ` 기술 ${pokemon.moves
        .slice(0, 4)
        .map(move => `${move.name} PP ${move.pp}/${move.maxPp}`)
        .join(", ")}.`
    : "";

  return `파티 ${partySize}마리. 선두 ${pokemon.name} 레벨 ${pokemon.level}, ${hp}${status}.${moves}`;
}

function formatPokemonStatus(status: NonNullable<PlayerPokemon["status"]>): string {
  if (status === "poisoned") {
    return "독";
  }

  if (status === "burned") {
    return "화상";
  }

  if (status === "paralyzed") {
    return "마비";
  }

  if (status === "fainted") {
    return "전투불능";
  }

  return "정상";
}

function formatConnectionStatus(status: GameState["session"]["connectionStatus"]): string {
  if (status === "online") {
    return "연결됨";
  }

  if (status === "connecting") {
    return "연결 중";
  }

  return "연결 끊김";
}
