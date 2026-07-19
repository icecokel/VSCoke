import type { CompetitiveRoomProjectionEvent } from "../network/localPreviewRoom";

export interface CompetitiveBattleLaunchKey {
  matchId: string;
  assignmentRevision: number;
}

export interface CompetitiveBattleLaunchCache {
  begin(event: CompetitiveRoomProjectionEvent): boolean;
  update(event: CompetitiveRoomProjectionEvent): void;
  get(matchId: string, assignmentRevision: number): CompetitiveRoomProjectionEvent | null;
  complete(matchId: string, assignmentRevision: number): void;
}

export function createCompetitiveBattleLaunchCache(): CompetitiveBattleLaunchCache {
  const projections = new Map<string, CompetitiveRoomProjectionEvent>();
  const begun = new Set<string>();
  const completed = new Set<string>();

  return {
    begin(event) {
      const key = toKey(event.projection.matchId, event.projection.assignmentRevision);
      if (completed.has(key)) {
        return false;
      }
      updateProjection(projections, key, event);
      if (begun.has(key)) {
        return false;
      }
      begun.add(key);
      return true;
    },
    update(event) {
      const key = toKey(event.projection.matchId, event.projection.assignmentRevision);
      if (completed.has(key)) {
        return;
      }
      updateProjection(projections, key, event);
    },
    get(matchId, assignmentRevision) {
      return projections.get(toKey(matchId, assignmentRevision)) ?? null;
    },
    complete(matchId, assignmentRevision) {
      const key = toKey(matchId, assignmentRevision);
      projections.delete(key);
      begun.delete(key);
      completed.add(key);
    },
  };
}

function updateProjection(
  projections: Map<string, CompetitiveRoomProjectionEvent>,
  key: string,
  event: CompetitiveRoomProjectionEvent,
): void {
  const current = projections.get(key);
  if (
    !current ||
    event.projection.currentTurn > current.projection.currentTurn ||
    (event.projection.currentTurn === current.projection.currentTurn &&
      projectionPriority(event) >= projectionPriority(current))
  ) {
    projections.set(key, event);
  }
}

function projectionPriority(event: CompetitiveRoomProjectionEvent): number {
  if (event.projection.status === "completed" || event.projection.terminal) {
    return 100;
  }
  return (
    (event.projection.status === "active" ? 10 : 0) + event.projection.submittedPlayerIds.length
  );
}

function toKey(matchId: string, assignmentRevision: number): string {
  return `${matchId}:${assignmentRevision}`;
}
