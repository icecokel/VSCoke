import type { ResumeRagEvalCase } from './resume-rag-eval-dataset';

export type ResumeRagEvalObservation = {
  caseId: string;
  // 키워드 별칭(createSearchTokens)이 일치해 확장 토큰을 만들었는지. 검색 여부와는 무관하고
  // 키워드 점수의 확장어 입력만 바뀐다.
  isGatePassed: boolean;
  // 검색 결과 청크 순서의 평가 key. 한 원문의 여러 청크가 연속으로 올 수 있다.
  retrievedSources: string[];
  retrievedContents: string[];
};

export type ResumeRagEvalSummary = {
  questions: number;
  answerable: number;
  unanswerable: number;
  // 답할 수 있는 질문 중 키워드 별칭이 일치한 비율
  gatePassRate: number | null;
  // 답할 수 있는 질문 중 청크가 1개 이상 검색된 비율
  retrievedRate: number | null;
  // 정답 출처가 지정되어 recall·MRR을 계산한 문항 수
  scored: number;
  recallAtK: number | null;
  hitRateAtK: number | null;
  mrr: number | null;
  mustMentionRate: number | null;
  // 답할 수 없는 질문 중 청크가 1개 이상 검색된 비율. 검색 전용 지표다. 순위 기반 검색은 늘
  // 후보를 돌려주고 답변 가능 여부는 답변 모델이 판단하므로 최종 답변의 오답률이 아니다.
  falsePositiveRate: number | null;
  unanswerableGatePassRate: number | null;
};

const uniqueInOrder = (keys: string[]): string[] => [...new Set(keys)];

const mean = (values: number[]): number | null =>
  values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const rate = (items: boolean[]): number | null =>
  mean(items.map((item) => (item ? 1 : 0)));

// 상위 k개 원문 중 정답 원문 비율. 정답이 k개보다 많으면 k개를 모두 맞힌 경우를 1로 본다.
export const recallAtK = (
  expected: string[],
  retrieved: string[],
  k: number,
): number | null => {
  const relevant = new Set(expected);
  if (relevant.size === 0) return null;
  const hits = uniqueInOrder(retrieved)
    .slice(0, k)
    .filter((key) => relevant.has(key)).length;
  return hits / Math.min(relevant.size, k);
};

// 첫 정답 원문의 원문 단위 순위 역수. 상위 k개 안에 없으면 0이다.
export const reciprocalRankAtK = (
  expected: string[],
  retrieved: string[],
  k: number,
): number | null => {
  const relevant = new Set(expected);
  if (relevant.size === 0) return null;
  const rank = uniqueInOrder(retrieved)
    .slice(0, k)
    .findIndex((key) => relevant.has(key));
  return rank === -1 ? 0 : 1 / (rank + 1);
};

// 검색된 청크 본문에 필수 언급어가 들어 있는 비율. 대소문자는 구분하지 않는다.
export const mustMentionCoverage = (
  terms: string[],
  contents: string[],
): number | null => {
  if (terms.length === 0) return null;
  const text = contents.join('\n').toLowerCase();
  return (
    terms.filter((term) => text.includes(term.toLowerCase())).length /
    terms.length
  );
};

export const summarizeResumeRagEval = (
  cases: ResumeRagEvalCase[],
  observations: ResumeRagEvalObservation[],
  k: number,
): ResumeRagEvalSummary => {
  const byId = new Map(observations.map((item) => [item.caseId, item]));
  const rows = cases.map((item) => {
    const observation = byId.get(item.id);
    if (!observation) throw new Error(`평가 결과가 없습니다: ${item.id}`);
    return { item, observation };
  });
  const answerable = rows.filter(({ item }) => item.answerable);
  const unanswerable = rows.filter(({ item }) => !item.answerable);
  const scored = answerable.filter(({ item }) => item.expectedSources.length);
  const recalls = scored.map(
    ({ item, observation }) =>
      recallAtK(item.expectedSources, observation.retrievedSources, k) ?? 0,
  );
  const reciprocalRanks = scored.map(
    ({ item, observation }) =>
      reciprocalRankAtK(
        item.expectedSources,
        observation.retrievedSources,
        k,
      ) ?? 0,
  );
  const mentions = answerable
    .map(({ item, observation }) =>
      mustMentionCoverage(item.mustMention, observation.retrievedContents),
    )
    .filter((value): value is number => value !== null);

  return {
    questions: rows.length,
    answerable: answerable.length,
    unanswerable: unanswerable.length,
    gatePassRate: rate(
      answerable.map(({ observation }) => observation.isGatePassed),
    ),
    retrievedRate: rate(
      answerable.map(
        ({ observation }) => observation.retrievedSources.length > 0,
      ),
    ),
    scored: scored.length,
    recallAtK: mean(recalls),
    hitRateAtK: rate(reciprocalRanks.map((value) => value > 0)),
    mrr: mean(reciprocalRanks),
    mustMentionRate: mean(mentions),
    falsePositiveRate: rate(
      unanswerable.map(
        ({ observation }) => observation.retrievedSources.length > 0,
      ),
    ),
    unanswerableGatePassRate: rate(
      unanswerable.map(({ observation }) => observation.isGatePassed),
    ),
  };
};

// locale별 요약과 전체 요약을 함께 만든다.
export const summarizeResumeRagEvalByLocale = (
  cases: ResumeRagEvalCase[],
  observations: ResumeRagEvalObservation[],
  k: number,
): Record<string, ResumeRagEvalSummary> => {
  const locales = uniqueInOrder(cases.map((item) => item.locale));
  return Object.fromEntries([
    ...locales.map((locale): [string, ResumeRagEvalSummary] => [
      locale,
      summarizeResumeRagEval(
        cases.filter((item) => item.locale === locale),
        observations,
        k,
      ),
    ]),
    ['all', summarizeResumeRagEval(cases, observations, k)],
  ]);
};
