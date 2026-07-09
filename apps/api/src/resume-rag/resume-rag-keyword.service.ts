import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  RESUME_RAG_KEYWORD_GROUPS,
  SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP,
  calculateResumeRagKeywordScore,
  createResumeRagSearchTokens,
  isResumeRagQuestionInScope,
  type ResumeRagKeywordGroup,
} from './resume-rag-keyword-gate';

type ResumeRagKeywordTermRow = {
  groupId: string;
  weight: number | string;
  termType: string;
  term: string;
};

type MutableKeywordGroup = {
  id: string;
  weight: number;
  aliases: string[];
  searchExpansions: string[];
};

const KEYWORD_TERM_QUERY = `
  SELECT
    groups."id" AS "groupId",
    groups."weight" AS "weight",
    terms."termType" AS "termType",
    terms."term" AS "term"
  FROM resume_rag_keyword_groups groups
  INNER JOIN resume_rag_keyword_terms terms
    ON terms."groupId" = groups."id"
  WHERE groups."enabled" = TRUE
    AND terms."enabled" = TRUE
  ORDER BY groups."sortOrder" ASC, terms."sortOrder" ASC, terms."term" ASC
`;

const MISSING_KEYWORD_TABLE_ERROR_CODES = new Set(['42P01', '42703']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isMissingKeywordTableError = (error: unknown): boolean =>
  isRecord(error) &&
  typeof error.code === 'string' &&
  MISSING_KEYWORD_TABLE_ERROR_CODES.has(error.code);

const readKeywordRow = (value: unknown): ResumeRagKeywordTermRow | null => {
  if (!isRecord(value)) return null;

  if (
    typeof value.groupId !== 'string' ||
    (typeof value.weight !== 'number' && typeof value.weight !== 'string') ||
    typeof value.termType !== 'string' ||
    typeof value.term !== 'string'
  ) {
    return null;
  }

  return {
    groupId: value.groupId,
    weight: value.weight,
    termType: value.termType,
    term: value.term,
  };
};

const normalizeWeight = (value: number | string): number => {
  const weight = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
};

const pushUnique = (items: string[], value: string): void => {
  const term = value.trim();
  if (term && !items.includes(term)) {
    items.push(term);
  }
};

const toKeywordGroups = (
  rows: readonly ResumeRagKeywordTermRow[],
): ResumeRagKeywordGroup[] => {
  const groupsById = new Map<string, MutableKeywordGroup>();

  for (const row of rows) {
    const group =
      groupsById.get(row.groupId) ??
      ({
        id: row.groupId,
        weight: normalizeWeight(row.weight),
        aliases: [],
        searchExpansions: [],
      } satisfies MutableKeywordGroup);
    groupsById.set(row.groupId, group);

    if (row.termType === 'alias') {
      pushUnique(group.aliases, row.term);
      continue;
    }

    if (row.termType === 'search_expansion') {
      pushUnique(group.searchExpansions, row.term);
    }
  }

  return [...groupsById.values()]
    .filter((group) => group.aliases.length > 0)
    .map((group) => ({
      id: group.id,
      weight: group.weight,
      aliases: group.aliases,
      ...(group.searchExpansions.length > 0
        ? { searchExpansions: group.searchExpansions }
        : {}),
    }));
};

const toMutableKeywordGroup = (
  group: ResumeRagKeywordGroup,
): MutableKeywordGroup => ({
  id: group.id,
  weight: group.weight,
  aliases: [...group.aliases],
  searchExpansions: [
    ...(group.searchExpansions ??
      SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP[group.id] ??
      []),
  ],
});

const mergeKeywordGroups = (
  baseGroups: readonly ResumeRagKeywordGroup[],
  databaseGroups: readonly ResumeRagKeywordGroup[],
): ResumeRagKeywordGroup[] => {
  const groupsById = new Map(
    baseGroups.map((group) => [group.id, toMutableKeywordGroup(group)]),
  );

  for (const databaseGroup of databaseGroups) {
    const group =
      groupsById.get(databaseGroup.id) ?? toMutableKeywordGroup(databaseGroup);
    groupsById.set(databaseGroup.id, group);

    group.weight = databaseGroup.weight;
    for (const alias of databaseGroup.aliases) {
      pushUnique(group.aliases, alias);
    }
    for (const expansion of databaseGroup.searchExpansions ?? []) {
      pushUnique(group.searchExpansions, expansion);
    }
  }

  return [...groupsById.values()].map((group) => ({
    id: group.id,
    weight: group.weight,
    aliases: group.aliases,
    ...(group.searchExpansions.length > 0
      ? { searchExpansions: group.searchExpansions }
      : {}),
  }));
};

@Injectable()
export class ResumeRagKeywordService {
  constructor(private readonly dataSource: DataSource) {}

  async calculateKeywordScore(question: string): Promise<number> {
    return calculateResumeRagKeywordScore(
      question,
      await this.loadKeywordGroups(),
    );
  }

  async isQuestionInScope(question: string): Promise<boolean> {
    return isResumeRagQuestionInScope(question, await this.loadKeywordGroups());
  }

  async createSearchTokens(question: string): Promise<string[]> {
    return createResumeRagSearchTokens(
      question,
      await this.loadKeywordGroups(),
    );
  }

  private async loadKeywordGroups(): Promise<readonly ResumeRagKeywordGroup[]> {
    try {
      const result: unknown = await this.dataSource.query(KEYWORD_TERM_QUERY);
      if (!Array.isArray(result)) return RESUME_RAG_KEYWORD_GROUPS;

      const rows = result
        .map(readKeywordRow)
        .filter((row): row is ResumeRagKeywordTermRow => row !== null);
      const groups = toKeywordGroups(rows);

      return groups.length > 0
        ? mergeKeywordGroups(RESUME_RAG_KEYWORD_GROUPS, groups)
        : RESUME_RAG_KEYWORD_GROUPS;
    } catch (error) {
      if (isMissingKeywordTableError(error)) {
        return RESUME_RAG_KEYWORD_GROUPS;
      }

      throw error;
    }
  }
}
