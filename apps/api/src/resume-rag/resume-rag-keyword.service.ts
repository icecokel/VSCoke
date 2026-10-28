import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  RESUME_RAG_KEYWORD_GROUPS,
  SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP,
  createResumeRagSearchTokens,
  normalizeResumeRagSearchText,
  type ResumeRagKeywordGroup,
} from './resume-rag-keyword-gate';

type ResumeRagKeywordTermRow = {
  groupId: string;
  weight: number | string;
  termType: string | null;
  term: string | null;
  groupEnabled: boolean;
  termEnabled: boolean;
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
    terms."term" AS "term",
    (groups.enabled AND groups.deleted_at IS NULL) AS "groupEnabled",
    (terms.enabled AND terms.deleted_at IS NULL) AS "termEnabled"
  FROM resume_rag_keyword_groups groups
  LEFT JOIN resume_rag_keyword_terms terms
    ON terms."groupId" = groups."id"
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
    (value.termType !== null && typeof value.termType !== 'string') ||
    (value.term !== null && typeof value.term !== 'string')
  ) {
    return null;
  }

  return {
    groupId: value.groupId,
    weight: value.weight,
    termType: value.termType,
    term: value.term,
    groupEnabled: value.groupEnabled !== false,
    termEnabled: value.termEnabled !== false,
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
    if (!row.groupEnabled || !row.termEnabled || row.term === null) continue;
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
      searchExpansions: group.searchExpansions,
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

      const baseGroups = RESUME_RAG_KEYWORD_GROUPS.filter(
        (group) =>
          !rows.some((row) => row.groupId === group.id && !row.groupEnabled),
      ).map((group) => {
        const blocked = rows.filter(
          (row) => row.groupId === group.id && !row.termEnabled,
        );
        const base = toMutableKeywordGroup(group);
        return {
          ...base,
          aliases: base.aliases.filter(
            (term) =>
              !blocked.some(
                (row) =>
                  row.termType === 'alias' &&
                  row.term !== null &&
                  normalizeResumeRagSearchText(row.term).replaceAll(' ', '') ===
                    normalizeResumeRagSearchText(term).replaceAll(' ', ''),
              ),
          ),
          searchExpansions: base.searchExpansions.filter(
            (term) =>
              !blocked.some(
                (row) =>
                  row.termType === 'search_expansion' &&
                  row.term !== null &&
                  normalizeResumeRagSearchText(row.term).replaceAll(' ', '') ===
                    normalizeResumeRagSearchText(term).replaceAll(' ', ''),
              ),
          ),
        };
      });
      return mergeKeywordGroups(baseGroups, groups).filter(
        (group) => group.aliases.length > 0,
      );
    } catch (error) {
      if (isMissingKeywordTableError(error)) {
        return RESUME_RAG_KEYWORD_GROUPS;
      }

      throw error;
    }
  }
}
