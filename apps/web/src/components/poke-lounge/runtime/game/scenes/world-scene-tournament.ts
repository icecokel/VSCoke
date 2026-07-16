import type { BattleResultReason } from "../battle/battleTypes";
import {
  createRoundScoreUpdatedAuthorityPayloads,
  createTournamentCompletedAuthorityPayload,
  createTournamentMatchResultAuthorityPayload,
} from "../network/tournamentAuthority";
import type { PlayerSnapshot } from "../network/localPreviewRoom";
import {
  createDefaultLocalPlayer,
  type GameState,
  type GameStateStore,
  type LocalPlayerState,
} from "../state/gameStateStore";
import type { TournamentMatch, TournamentStanding } from "../tournament/tournamentState";
import {
  getTournamentSessionStandings,
  type TournamentSession,
} from "../tournament/tournamentSession";
import {
  createTournamentResultPanelViewModel,
  formatTournamentResultRow,
} from "../tournament/tournamentResultViewModel";

export interface WorldTournamentBattleResult {
  matchId: string;
  winnerPlayerId: string;
  loserPlayerId: string;
  reason: BattleResultReason;
}

export interface WorldSceneTournament {
  update(nowMs: number): void;
  applyReturnedResult(result: WorldTournamentBattleResult): void;
  destroy(): void;
}

export interface WorldSceneTournamentController extends WorldSceneTournament {
  clearPresentation(): void;
  showResultPresentationIfNeeded(): void;
}

interface TournamentAnnouncement {
  destroy(): void;
}

export interface WorldSceneTournamentDependencies {
  gameStateStore: GameStateStore;
  isBattleIntroPlaying(): boolean;
  hasWorldPlayer(): boolean;
  isRoomTournamentHost(): boolean;
  getRemotePlayerSnapshots(): ReadonlyArray<PlayerSnapshot>;
  startTrainerBattle(
    match: TournamentMatch,
    player: LocalPlayerState,
    opponent: LocalPlayerState,
  ): void;
  getRoomHostPlayerId(): string | null;
  sendTournamentStarted(session: TournamentSession): void;
  sendTournamentMatchResult(
    payload: ReturnType<typeof createTournamentMatchResultAuthorityPayload> extends infer Payload
      ? Exclude<Payload, null>
      : never,
  ): void;
  sendTournamentCompleted(
    payload: ReturnType<typeof createTournamentCompletedAuthorityPayload> extends infer Payload
      ? Exclude<Payload, null>
      : never,
  ): void;
  sendRoundScoreUpdates(
    payloads: ReturnType<typeof createRoundScoreUpdatedAuthorityPayloads>,
  ): void;
  createAnnouncement(text: string, fontSize: "14px" | "16px"): TournamentAnnouncement;
}

export function createWorldSceneTournament(
  dependencies: WorldSceneTournamentDependencies,
): WorldSceneTournamentController {
  return new DefaultWorldSceneTournament(dependencies);
}

class DefaultWorldSceneTournament implements WorldSceneTournamentController {
  private announcement: TournamentAnnouncement | null = null;
  private tournamentBattleStarting = false;
  private submittedServerMatchId: string | null = null;

  constructor(private readonly dependencies: WorldSceneTournamentDependencies) {}

  update(nowMs: number): void {
    void nowMs;
    const state = this.dependencies.gameStateStore.getState();

    if (state.round.phase === "tournament") {
      const activeMatchId = state.tournament.serverProjection?.tournament.activeMatchId ?? null;
      if (this.submittedServerMatchId && this.submittedServerMatchId !== activeMatchId) {
        this.submittedServerMatchId = null;
      }

      if (this.tryStartTournamentBattle()) {
        return;
      }

      this.showTournamentPendingMessage();
      return;
    }

    this.showResultPresentationIfNeeded();
  }

  applyReturnedResult(result: WorldTournamentBattleResult): void {
    const { gameStateStore } = this.dependencies;
    const tournamentState = gameStateStore.getState().tournament;
    const serverProjection = tournamentState.serverProjection;

    if (serverProjection) {
      const activeMatch = gameStateStore.getCurrentTournamentMatch();

      if (
        activeMatch?.matchId !== result.matchId ||
        !activeMatch ||
        !getMatchParticipantIds(activeMatch).includes(result.winnerPlayerId)
      ) {
        return;
      }

      this.submittedServerMatchId = result.matchId;
      this.dependencies.sendTournamentMatchResult({
        roundIndex: serverProjection.roundIndex,
        matchId: result.matchId,
        winnerPlayerId: result.winnerPlayerId,
        reason: result.reason,
      });
      this.clearPresentation();
      return;
    }

    const previousSession = tournamentState.session;
    const recorded = gameStateStore.recordTournamentMatchResult(
      result.matchId,
      result.winnerPlayerId,
      Date.now(),
    );
    const hostPlayerId = this.dependencies.getRoomHostPlayerId();

    if (!previousSession || !hostPlayerId || !recorded.ok) {
      return;
    }

    const matchPayload = createTournamentMatchResultAuthorityPayload({
      hostPlayerId,
      session: previousSession,
      matchId: result.matchId,
      winnerPlayerId: result.winnerPlayerId,
      reason: result.reason,
    });

    if (matchPayload) {
      this.dependencies.sendTournamentMatchResult(matchPayload);
    }

    if (!recorded.completed) {
      return;
    }

    const standings = recorded.standings.map(standing => ({
      playerId: standing.playerId,
      rank: standing.rank,
      score: standing.score,
    }));
    const completedPayload = createTournamentCompletedAuthorityPayload({
      hostPlayerId,
      session: recorded.session,
      standings,
    });

    if (completedPayload) {
      this.dependencies.sendTournamentCompleted(completedPayload);
    }

    this.dependencies.sendRoundScoreUpdates(
      createRoundScoreUpdatedAuthorityPayloads({
        roundIndex: recorded.session.roundIndex,
        hostPlayerId,
        standings,
      }),
    );
  }

  clearPresentation(): void {
    this.announcement?.destroy();
    this.announcement = null;
  }

  showResultPresentationIfNeeded(): void {
    const state = this.dependencies.gameStateStore.getState();

    if (
      this.announcement ||
      (state.round.phase !== "round-result" && state.round.phase !== "game-result")
    ) {
      return;
    }

    const standings = createVisibleTournamentStandings(state);

    if (standings.length === 0) {
      return;
    }

    const panel = createTournamentResultPanelViewModel({
      roundIndex: state.round.roundIndex,
      totalRounds: state.round.totalRounds,
      final: state.round.phase === "game-result",
      standings,
      roundScores: state.tournament.lastRoundScores,
      cumulativeScores: state.tournament.scoresByPlayerId,
    });
    this.announcement = this.dependencies.createAnnouncement(
      [panel.title, ...panel.rows.map(formatTournamentResultRow), panel.nextActionLabel].join("\n"),
      "14px",
    );
  }

  destroy(): void {
    this.clearPresentation();
    this.tournamentBattleStarting = false;
    this.submittedServerMatchId = null;
  }

  private showTournamentPendingMessage(): void {
    if (this.announcement) {
      return;
    }

    this.announcement = this.dependencies.createAnnouncement(this.getPendingMessage(), "16px");
  }

  private tryStartTournamentBattle(): boolean {
    if (
      this.dependencies.isBattleIntroPlaying() ||
      this.tournamentBattleStarting ||
      !this.dependencies.hasWorldPlayer()
    ) {
      return false;
    }

    const { gameStateStore } = this.dependencies;
    const state = gameStateStore.getState();
    const session = state.tournament.session;

    if (state.tournament.serverProjection) {
      return this.tryStartServerTournamentBattle();
    }

    if (
      !session ||
      session.status !== "in-progress" ||
      session.roundIndex !== state.round.roundIndex
    ) {
      if (!this.dependencies.isRoomTournamentHost()) {
        return false;
      }

      const tournamentPlayers = this.getEligibleTournamentPlayers();

      if (tournamentPlayers.length < 2) {
        return false;
      }

      const started = gameStateStore.startTournamentSession(
        tournamentPlayers.map(player => ({
          playerId: player.playerId,
          displayName: player.displayName,
        })),
      );

      if (!started.ok) {
        return false;
      }

      this.dependencies.sendTournamentStarted(started.session);
    }

    if (!this.dependencies.isRoomTournamentHost()) {
      return false;
    }

    const match = gameStateStore.getCurrentTournamentMatch();

    if (!match) {
      return false;
    }

    const player = this.getTournamentBattlePlayer(match.participantA.playerId);
    const opponent = this.getTournamentBattlePlayer(match.participantB.playerId);

    if (
      !player ||
      !opponent ||
      !hasActiveTournamentPokemon(player) ||
      !hasActiveTournamentPokemon(opponent)
    ) {
      return false;
    }

    this.tournamentBattleStarting = true;
    this.dependencies.startTrainerBattle(match, player, opponent);

    return true;
  }

  private getEligibleTournamentPlayers(): LocalPlayerState[] {
    const { gameStateStore } = this.dependencies;
    const state = gameStateStore.getState();
    const currentPlayer = state.playersById[state.currentPlayerId];
    const otherPlayers = Object.values(state.playersById)
      .filter(player => player.playerId !== state.currentPlayerId)
      .sort((left, right) =>
        left.playerId.localeCompare(right.playerId, undefined, { numeric: true }),
      );
    const localPlayers = [currentPlayer, ...otherPlayers].filter(
      (player): player is LocalPlayerState => Boolean(player),
    );
    const usedPlayerIds = new Set(localPlayers.map(player => player.playerId));
    const remotePlayers = this.dependencies
      .getRemotePlayerSnapshots()
      .map(snapshot => {
        const preferredPlayerId = snapshot.playerId?.trim() || snapshot.sessionId;
        const playerId = usedPlayerIds.has(preferredPlayerId)
          ? snapshot.sessionId
          : preferredPlayerId;
        const player = toTournamentLocalPlayerFromSnapshot(snapshot, playerId);

        if (player) {
          usedPlayerIds.add(player.playerId);
        }

        return player;
      })
      .filter((player): player is LocalPlayerState => Boolean(player))
      .sort((left, right) =>
        left.playerId.localeCompare(right.playerId, undefined, { numeric: true }),
      );

    return [...localPlayers, ...remotePlayers].filter(hasActiveTournamentPokemon).slice(0, 6);
  }

  private getTournamentBattlePlayer(playerId: string): LocalPlayerState | undefined {
    return this.getEligibleTournamentPlayers().find(player => player.playerId === playerId);
  }

  private tryStartServerTournamentBattle(): boolean {
    const state = this.dependencies.gameStateStore.getState();
    const projection = state.tournament.serverProjection;
    const match = this.dependencies.gameStateStore.getCurrentTournamentMatch();

    if (
      !projection ||
      projection.activeMatchTransport !== "casual" ||
      !match ||
      this.submittedServerMatchId === match.matchId ||
      !getMatchParticipantIds(match).includes(state.currentPlayerId)
    ) {
      return false;
    }

    const opponentPlayerId = getMatchParticipantIds(match).find(
      playerId => playerId !== state.currentPlayerId,
    );
    const player = this.getTournamentBattlePlayer(state.currentPlayerId);
    const opponent = opponentPlayerId
      ? this.getTournamentBattlePlayer(opponentPlayerId)
      : undefined;

    if (
      !player ||
      !opponent ||
      !hasActiveTournamentPokemon(player) ||
      !hasActiveTournamentPokemon(opponent)
    ) {
      return false;
    }

    this.tournamentBattleStarting = true;
    this.dependencies.startTrainerBattle(match, player, opponent);

    return true;
  }

  private getPendingMessage(): string {
    const state = this.dependencies.gameStateStore.getState();
    const projection = state.tournament.serverProjection;

    if (!projection) {
      return "준비 시간이 끝났다.\n토너먼트 대기 중";
    }

    if (projection.resultSync.matchId === projection.tournament.activeMatchId) {
      if (projection.resultSync.status === "submitting") {
        return "경기 결과 전송 중";
      }

      if (projection.resultSync.status === "recovering") {
        return "경기 결과 확인 중\n서버 상태를 복구하고 있습니다";
      }

      if (projection.resultSync.status === "error") {
        return "경기 결과 동기화 실패\n서버 상태를 다시 불러오고 있습니다";
      }
    }

    const bracket = projection.tournament.bracket;
    const ownPlayerId = projection.ownPlayerId;

    if (bracket?.status === "completed") {
      return "토너먼트 완료";
    }

    if (bracket?.currentRound?.byes.some(bye => bye.entrant.playerId === ownPlayerId)) {
      return "부전승 — 다음 대진을 기다리는 중";
    }

    const activeMatch = bracket?.currentRound?.matches.find(
      match => match.matchId === projection.tournament.activeMatchId,
    );

    if (activeMatch && getMatchParticipantIds(activeMatch).includes(ownPlayerId)) {
      if (projection.activeMatchTransport === "awaiting-authority") {
        return "상대 연결 대기 중";
      }

      return "현재 경기 연결 중";
    }

    if (activeMatch) {
      return "현재 경기 진행 중 — 다음 대진을 기다리는 중";
    }

    return "다음 대진을 기다리는 중";
  }
}

function getMatchParticipantIds(match: TournamentMatch): [string, string] {
  return [match.participantA.playerId, match.participantB.playerId];
}

function createVisibleTournamentStandings(state: GameState): TournamentStanding[] {
  if (state.tournament.session?.status === "completed") {
    return getTournamentSessionStandings(state.tournament.session);
  }

  return state.tournament.standings.map(standing => ({
    playerId: standing.playerId,
    displayName: standing.displayName,
    seed: standing.seed,
    rank: standing.rank,
    champion: standing.rank === 1,
    eliminatedRoundNumber: standing.rank === 1 ? null : state.round.roundIndex,
  }));
}

function hasActiveTournamentPokemon(player: LocalPlayerState): boolean {
  const activePokemon = player.party.find(
    slot => slot.slotIndex === player.activePartySlotIndex,
  )?.pokemon;

  if (!activePokemon || activePokemon.status === "fainted") {
    return false;
  }

  if (typeof activePokemon.currentHp === "number" && activePokemon.currentHp <= 0) {
    return false;
  }

  return true;
}

function toTournamentLocalPlayerFromSnapshot(
  snapshot: PlayerSnapshot,
  playerIdOverride?: string,
): LocalPlayerState | null {
  const playerId = playerIdOverride?.trim() || snapshot.playerId?.trim() || snapshot.sessionId;
  const party = cloneTournamentSnapshotParty(snapshot.party);
  const activePartySlotIndex = normalizeTournamentActivePartySlotIndex(
    snapshot.activePartySlotIndex,
    party,
  );

  if (activePartySlotIndex === null) {
    return null;
  }

  const defaultPlayer = createDefaultLocalPlayer(playerId);

  return {
    ...defaultPlayer,
    playerId,
    displayName: snapshot.displayName?.trim() || playerId,
    party,
    activePartySlotIndex,
    position: {
      mapKey: snapshot.map,
      x: snapshot.x,
      y: snapshot.y,
      facing: snapshot.facing,
    },
  };
}

function cloneTournamentSnapshotParty(
  party: PlayerSnapshot["party"] | undefined,
): NonNullable<PlayerSnapshot["party"]> {
  return (
    party?.map(slot => ({
      slotIndex: slot.slotIndex,
      pokemon: slot.pokemon
        ? {
            ...slot.pokemon,
            moves: slot.pokemon.moves?.map(move => ({ ...move })),
          }
        : null,
    })) ?? []
  );
}

function normalizeTournamentActivePartySlotIndex(
  activePartySlotIndex: number | undefined,
  party: NonNullable<PlayerSnapshot["party"]>,
): number | null {
  const requestedSlotIndex =
    typeof activePartySlotIndex === "number" && Number.isInteger(activePartySlotIndex)
      ? activePartySlotIndex
      : 0;

  if (party.some(slot => slot.slotIndex === requestedSlotIndex && slot.pokemon)) {
    return requestedSlotIndex;
  }

  return party.find(slot => slot.pokemon)?.slotIndex ?? null;
}

export function isWorldTournamentBattleResult(
  value: unknown,
): value is WorldTournamentBattleResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WorldTournamentBattleResult).matchId === "string" &&
    typeof (value as WorldTournamentBattleResult).winnerPlayerId === "string" &&
    typeof (value as WorldTournamentBattleResult).loserPlayerId === "string" &&
    typeof (value as WorldTournamentBattleResult).reason === "string"
  );
}
