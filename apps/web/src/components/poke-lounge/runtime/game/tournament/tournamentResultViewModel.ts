import type { TournamentStanding } from "./tournamentState";

export type TournamentResultScoreLookup =
  | Readonly<Record<string, number | null | undefined>>
  | ReadonlyMap<string, number | null | undefined>
  | ReadonlyArray<{ playerId: string; score: number | null | undefined }>;

export interface TournamentResultRow {
  displayName: string;
  rankLabel: string;
  rankTieLabel: string | null;
  roundScore: number;
  roundScoreLabel: string;
  cumulativeScore: number;
  cumulativeScoreLabel: string;
  champion: boolean;
}

export interface CreateTournamentResultRowsInput {
  standings: ReadonlyArray<TournamentStanding>;
  roundScores?: TournamentResultScoreLookup;
  cumulativeScores?: TournamentResultScoreLookup;
}

export interface CreateTournamentResultTitleInput {
  roundIndex: number;
  totalRounds: number;
  final: boolean;
}

export type CreateTournamentResultPanelViewModelInput = CreateTournamentResultRowsInput &
  CreateTournamentResultTitleInput;

export interface TournamentResultPanelViewModel {
  title: string;
  final: boolean;
  nextActionLabel: string;
  rows: TournamentResultRow[];
}

export function createTournamentResultRows({
  standings,
  roundScores,
  cumulativeScores,
}: CreateTournamentResultRowsInput): TournamentResultRow[] {
  const sortedStandings = [...standings].sort(
    (left, right) => left.rank - right.rank || left.seed - right.seed,
  );
  const tiedRanks = createTiedRankSet(sortedStandings);

  return sortedStandings.map(standing => {
    const roundScore = readScore(roundScores, standing.playerId);
    const cumulativeScore = readScore(cumulativeScores, standing.playerId);

    return {
      displayName: standing.displayName,
      rankLabel: `#${standing.rank}`,
      rankTieLabel: tiedRanks.has(standing.rank) ? "Tie" : null,
      roundScore,
      roundScoreLabel: `+${roundScore}`,
      cumulativeScore,
      cumulativeScoreLabel: `Total ${cumulativeScore}`,
      champion: standing.champion,
    };
  });
}

export function createTournamentResultPanelViewModel({
  roundIndex,
  totalRounds,
  final,
  standings,
  roundScores,
  cumulativeScores,
}: CreateTournamentResultPanelViewModelInput): TournamentResultPanelViewModel {
  return {
    title: createTournamentResultTitle({ roundIndex, totalRounds, final }),
    final,
    nextActionLabel: final ? "Finish Tournament" : "Start Next Round",
    rows: createTournamentResultRows({ standings, roundScores, cumulativeScores }),
  };
}

export function createTournamentResultTitle({
  roundIndex,
  totalRounds,
  final,
}: CreateTournamentResultTitleInput): string {
  if (final) {
    return "Final Result";
  }

  const visibleRound = Math.max(1, roundIndex);

  return `Round ${visibleRound}/${totalRounds} Result`;
}

export function formatTournamentResultRow(row: TournamentResultRow): string {
  return `${row.rankLabel} ${row.displayName} +${row.roundScore} / ${row.cumulativeScore}`;
}

function createTiedRankSet(standings: ReadonlyArray<TournamentStanding>): ReadonlySet<number> {
  const rankCounts = new Map<number, number>();

  for (const standing of standings) {
    rankCounts.set(standing.rank, (rankCounts.get(standing.rank) ?? 0) + 1);
  }

  return new Set([...rankCounts.entries()].filter(([, count]) => count > 1).map(([rank]) => rank));
}

function readScore(scores: TournamentResultScoreLookup | undefined, playerId: string): number {
  if (!scores) {
    return 0;
  }

  const score = Array.isArray(scores)
    ? scores.find(row => row.playerId === playerId)?.score
    : typeof (scores as ReadonlyMap<string, number | null | undefined>).get === "function"
      ? (scores as ReadonlyMap<string, number | null | undefined>).get(playerId)
      : (scores as Readonly<Record<string, number | null | undefined>>)[playerId];

  if (typeof score !== "number" || !Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.floor(score));
}
