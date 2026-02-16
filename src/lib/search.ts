import type { SearchItem } from "@/types/search";

const normalizeText = (value: string): string => {
  return value.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
};

const splitTokens = (query: string): string[] => {
  return normalizeText(query)
    .split(" ")
    .map(token => token.trim())
    .filter(Boolean);
};

const scoreItem = (item: SearchItem, query: string): number => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return item.priority ?? 0;
  }

  const tokens = splitTokens(query);
  const title = normalizeText(item.title);
  const description = normalizeText(item.description ?? "");
  const keywordText = normalizeText((item.keywords ?? []).join(" "));

  const searchable = `${title} ${description} ${keywordText}`.trim();
  if (!searchable) {
    return -1;
  }

  let score = item.priority ?? 0;

  if (title === normalizedQuery) score += 320;
  else if (title.startsWith(normalizedQuery)) score += 200;
  else if (title.includes(normalizedQuery)) score += 140;

  if (keywordText.includes(normalizedQuery)) score += 90;
  if (description.includes(normalizedQuery)) score += 60;

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 36;
      continue;
    }

    if (keywordText.includes(token)) {
      score += 24;
      continue;
    }

    if (description.includes(token)) {
      score += 16;
      continue;
    }

    return -1;
  }

  return score;
};

export const searchItems = (items: SearchItem[], query: string, limit = 30): SearchItem[] => {
  return items
    .map(item => ({ item, score: scoreItem(item, query) }))
    .filter(({ score }) => score > -1)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.item.title.localeCompare(b.item.title);
    })
    .slice(0, limit)
    .map(({ item }) => item);
};

export const getRecommendedItems = (items: SearchItem[], limit = 6): SearchItem[] => {
  const uniqueByPath = new Map<string, SearchItem>();
  const sorted = [...items].sort((a, b) => {
    if ((a.featured ?? false) !== (b.featured ?? false)) {
      return a.featured ? -1 : 1;
    }
    return (b.priority ?? 0) - (a.priority ?? 0);
  });

  for (const item of sorted) {
    if (!uniqueByPath.has(item.path)) {
      uniqueByPath.set(item.path, item);
    }
    if (uniqueByPath.size === limit) {
      break;
    }
  }

  return [...uniqueByPath.values()];
};
