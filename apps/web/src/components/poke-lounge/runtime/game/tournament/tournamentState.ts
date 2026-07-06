export const TOURNAMENT_MIN_PARTICIPANT_COUNT = 2;
export const TOURNAMENT_MAX_PARTICIPANT_COUNT = 6;

export type TournamentStatus = "in-progress" | "completed";
export type TournamentMatchStatus = "ready" | "completed";

export interface TournamentParticipantInput {
  playerId: string;
  displayName: string;
}

export interface TournamentParticipant extends TournamentParticipantInput {
  seed: number;
}

export interface TournamentMatch {
  matchId: string;
  roundNumber: number;
  matchNumber: number;
  participantA: TournamentParticipant;
  participantB: TournamentParticipant;
  status: TournamentMatchStatus;
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
}

export interface TournamentBye {
  byeId: string;
  roundNumber: number;
  slotNumber: number;
  entrant: TournamentParticipant;
}

export type TournamentRoundSlot =
  | {
      kind: "match";
      matchId: string;
    }
  | {
      kind: "bye";
      byeId: string;
    };

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  byes: TournamentBye[];
  slots: TournamentRoundSlot[];
}

export interface TournamentElimination {
  playerId: string;
  displayName: string;
  seed: number;
  roundNumber: number;
  matchId: string;
  order: number;
}

export interface TournamentState {
  status: TournamentStatus;
  participants: TournamentParticipant[];
  currentRound: TournamentRound | null;
  completedRounds: TournamentRound[];
  eliminations: TournamentElimination[];
  championPlayerId: string | null;
}

export interface TournamentStanding {
  playerId: string;
  displayName: string;
  seed: number;
  rank: number;
  champion: boolean;
  eliminatedRoundNumber: number | null;
}

export function createTournamentState(
  participantInputs: ReadonlyArray<TournamentParticipantInput>,
): TournamentState {
  const participants = normalizeTournamentParticipants(participantInputs);

  return {
    status: "in-progress",
    participants,
    currentRound: createTournamentRound(1, createOpeningRoundEntrants(participants)),
    completedRounds: [],
    eliminations: [],
    championPlayerId: null,
  };
}

export function recordTournamentMatchResult(
  state: TournamentState,
  matchId: string,
  winnerPlayerId: string,
): TournamentState {
  if (state.status === "completed") {
    throw new Error("Tournament is already completed.");
  }

  if (!state.currentRound) {
    throw new Error("Tournament has no active round.");
  }

  const match = state.currentRound.matches.find(candidate => candidate.matchId === matchId);

  if (!match) {
    throw new Error(`Unknown tournament match: ${matchId}`);
  }

  if (match.status === "completed") {
    throw new Error(`Tournament match is already completed: ${matchId}`);
  }

  const loser = getMatchLoser(match, winnerPlayerId);
  const completedMatch: TournamentMatch = {
    ...match,
    status: "completed",
    winnerPlayerId,
    loserPlayerId: loser.playerId,
  };
  const currentRound: TournamentRound = {
    ...state.currentRound,
    matches: state.currentRound.matches.map(candidate =>
      candidate.matchId === matchId ? completedMatch : candidate,
    ),
  };
  const eliminations = [
    ...state.eliminations,
    {
      playerId: loser.playerId,
      displayName: loser.displayName,
      seed: loser.seed,
      roundNumber: currentRound.roundNumber,
      matchId,
      order: state.eliminations.length + 1,
    },
  ];
  const updatedState: TournamentState = {
    ...state,
    currentRound,
    eliminations,
  };

  if (currentRound.matches.some(candidate => candidate.status !== "completed")) {
    return updatedState;
  }

  return advanceTournamentRound(updatedState, currentRound);
}

export function getReadyTournamentMatches(state: TournamentState): TournamentMatch[] {
  return state.currentRound?.matches.filter(match => match.status === "ready") ?? [];
}

export function getTournamentStandings(state: TournamentState): TournamentStanding[] {
  if (state.status !== "completed" || !state.championPlayerId) {
    return [];
  }

  const champion = getParticipantById(state.participants, state.championPlayerId);
  const standings: TournamentStanding[] = [
    {
      playerId: champion.playerId,
      displayName: champion.displayName,
      seed: champion.seed,
      rank: 1,
      champion: true,
      eliminatedRoundNumber: null,
    },
  ];
  const eliminatedRoundNumbers = Array.from(
    new Set(state.eliminations.map(elimination => elimination.roundNumber)),
  ).sort((left, right) => right - left);

  for (const roundNumber of eliminatedRoundNumbers) {
    const rank = standings.length + 1;
    const eliminations = state.eliminations
      .filter(elimination => elimination.roundNumber === roundNumber)
      .sort((left, right) => left.order - right.order);

    standings.push(
      ...eliminations.map(elimination => ({
        playerId: elimination.playerId,
        displayName: elimination.displayName,
        seed: elimination.seed,
        rank,
        champion: false,
        eliminatedRoundNumber: elimination.roundNumber,
      })),
    );
  }

  return standings;
}

function advanceTournamentRound(
  state: TournamentState,
  completedRound: TournamentRound,
): TournamentState {
  const entrants = completedRound.slots.map(slot =>
    slot.kind === "bye"
      ? getByeEntrant(completedRound, slot.byeId)
      : getMatchWinner(state.participants, completedRound, slot.matchId),
  );
  const completedRounds = [...state.completedRounds, completedRound];

  if (entrants.length === 1) {
    return {
      ...state,
      status: "completed",
      currentRound: null,
      completedRounds,
      championPlayerId: entrants[0].playerId,
    };
  }

  return {
    ...state,
    currentRound: createTournamentRound(completedRound.roundNumber + 1, entrants),
    completedRounds,
  };
}

function createTournamentRound(
  roundNumber: number,
  entrants: ReadonlyArray<TournamentParticipant | null>,
): TournamentRound {
  const matches: TournamentMatch[] = [];
  const byes: TournamentBye[] = [];
  const slots: TournamentRoundSlot[] = [];

  for (let index = 0; index < entrants.length; index += 2) {
    const participantA = entrants[index] ?? null;
    const participantB = entrants[index + 1] ?? null;
    const slotNumber = slots.length + 1;

    if (participantA && participantB) {
      const matchNumber = matches.length + 1;
      const matchId = createMatchId(roundNumber, matchNumber);

      matches.push({
        matchId,
        roundNumber,
        matchNumber,
        participantA,
        participantB,
        status: "ready",
        winnerPlayerId: null,
        loserPlayerId: null,
      });
      slots.push({
        kind: "match",
        matchId,
      });
      continue;
    }

    const byeEntrant = participantA ?? participantB;

    if (!byeEntrant) {
      throw new Error(`Tournament round ${roundNumber} has an empty bracket slot.`);
    }

    const byeId = createByeId(roundNumber, byes.length + 1);

    byes.push({
      byeId,
      roundNumber,
      slotNumber,
      entrant: byeEntrant,
    });
    slots.push({
      kind: "bye",
      byeId,
    });
  }

  return {
    roundNumber,
    matches,
    byes,
    slots,
  };
}

function createOpeningRoundEntrants(
  participants: ReadonlyArray<TournamentParticipant>,
): Array<TournamentParticipant | null> {
  return getBracketSeedOrder(participants.length).map(seed => participants[seed - 1] ?? null);
}

function getBracketSeedOrder(participantCount: number): readonly number[] {
  if (participantCount <= 2) {
    return [1, 2];
  }

  if (participantCount <= 4) {
    return [1, 4, 2, 3];
  }

  return [1, 8, 4, 5, 3, 6, 2, 7];
}

function normalizeTournamentParticipants(
  participantInputs: ReadonlyArray<TournamentParticipantInput>,
): TournamentParticipant[] {
  if (
    participantInputs.length < TOURNAMENT_MIN_PARTICIPANT_COUNT ||
    participantInputs.length > TOURNAMENT_MAX_PARTICIPANT_COUNT
  ) {
    throw new RangeError(
      `Tournament participant count must be between ${TOURNAMENT_MIN_PARTICIPANT_COUNT} and ${TOURNAMENT_MAX_PARTICIPANT_COUNT}: ${participantInputs.length}`,
    );
  }

  const playerIds = new Set<string>();

  return participantInputs.map((participantInput, index) => {
    const playerId = participantInput.playerId.trim();

    if (!playerId) {
      throw new Error(`Tournament participant ${index + 1} has an empty player id.`);
    }

    if (playerIds.has(playerId)) {
      throw new Error(`Duplicate tournament participant: ${playerId}`);
    }

    playerIds.add(playerId);

    return {
      playerId,
      displayName: participantInput.displayName.trim() || playerId,
      seed: index + 1,
    };
  });
}

function getMatchLoser(match: TournamentMatch, winnerPlayerId: string): TournamentParticipant {
  if (match.participantA.playerId === winnerPlayerId) {
    return match.participantB;
  }

  if (match.participantB.playerId === winnerPlayerId) {
    return match.participantA;
  }

  throw new Error(`Winner must belong to tournament match ${match.matchId}: ${winnerPlayerId}`);
}

function getMatchWinner(
  participants: ReadonlyArray<TournamentParticipant>,
  round: TournamentRound,
  matchId: string,
): TournamentParticipant {
  const match = round.matches.find(candidate => candidate.matchId === matchId);

  if (!match?.winnerPlayerId) {
    throw new Error(`Tournament match has no winner: ${matchId}`);
  }

  return getParticipantById(participants, match.winnerPlayerId);
}

function getByeEntrant(round: TournamentRound, byeId: string): TournamentParticipant {
  const bye = round.byes.find(candidate => candidate.byeId === byeId);

  if (!bye) {
    throw new Error(`Unknown tournament bye: ${byeId}`);
  }

  return bye.entrant;
}

function getParticipantById(
  participants: ReadonlyArray<TournamentParticipant>,
  playerId: string,
): TournamentParticipant {
  const participant = participants.find(candidate => candidate.playerId === playerId);

  if (!participant) {
    throw new Error(`Unknown tournament participant: ${playerId}`);
  }

  return participant;
}

function createMatchId(roundNumber: number, matchNumber: number): string {
  return `round-${roundNumber}-match-${matchNumber}`;
}

function createByeId(roundNumber: number, byeNumber: number): string {
  return `round-${roundNumber}-bye-${byeNumber}`;
}
