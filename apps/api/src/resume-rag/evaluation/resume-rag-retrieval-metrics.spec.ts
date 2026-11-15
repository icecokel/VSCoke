import type { ResumeRagEvalCase } from './resume-rag-eval-dataset';
import {
  mustMentionCoverage,
  recallAtK,
  reciprocalRankAtK,
  summarizeResumeRagEval,
  summarizeResumeRagEvalByLocale,
  type ResumeRagEvalObservation,
} from './resume-rag-retrieval-metrics';

const evalCase = (
  id: string,
  overrides: Partial<ResumeRagEvalCase> = {},
): ResumeRagEvalCase => ({
  id,
  topicId: id,
  origin: 'recruiter',
  locale: 'ko-KR',
  resumeKey: 'fe',
  question: `${id} 질문`,
  answerable: true,
  expectedSources: ['a'],
  mustMention: [],
  ...overrides,
});

const observed = (
  caseId: string,
  retrievedSources: string[],
  overrides: Partial<ResumeRagEvalObservation> = {},
): ResumeRagEvalObservation => ({
  caseId,
  isGatePassed: true,
  retrievedSources,
  retrievedContents: retrievedSources.map((key) => `${key} 본문`),
  ...overrides,
});

describe('이력 질문 RAG 검색 평가 지표', () => {
  it('recall@k는 같은 원문의 여러 청크를 한 번만 세고 정답 수가 k보다 많으면 k로 나눈다', () => {
    expect(recallAtK(['a', 'b'], ['a', 'a', 'c', 'b'], 5)).toBe(1);
    expect(recallAtK(['a', 'b'], ['c', 'a'], 5)).toBe(0.5);
    expect(recallAtK(['a', 'b', 'c', 'd'], ['a', 'b'], 2)).toBe(1);
    expect(recallAtK(['a', 'b'], ['c', 'd', 'a'], 2)).toBe(0);
    expect(recallAtK(['a'], [], 5)).toBe(0);
  });

  it('정답 출처가 없는 문항은 recall과 순위 역수를 계산하지 않는다', () => {
    expect(recallAtK([], ['a'], 5)).toBeNull();
    expect(reciprocalRankAtK([], ['a'], 5)).toBeNull();
  });

  it('순위 역수는 중복 청크를 합친 원문 순위로 첫 정답을 찾는다', () => {
    expect(reciprocalRankAtK(['b'], ['a', 'a', 'b'], 5)).toBe(0.5);
    expect(reciprocalRankAtK(['a', 'c'], ['b', 'c', 'a'], 5)).toBe(0.5);
    expect(reciprocalRankAtK(['c'], ['a', 'b', 'c'], 2)).toBe(0);
    expect(reciprocalRankAtK(['a'], [], 5)).toBe(0);
  });

  it('필수 언급어는 검색 본문 전체에서 대소문자 없이 찾는다', () => {
    expect(mustMentionCoverage(['WebP', '95%'], ['webp 변환', '약 95%'])).toBe(
      1,
    );
    expect(mustMentionCoverage(['WebP', 'LCP'], ['WebP 변환'])).toBe(0.5);
    expect(mustMentionCoverage([], ['WebP'])).toBeNull();
  });

  it('답할 수 있는 질문과 없는 질문을 나눠 관문·recall·MRR·오탐률을 집계한다', () => {
    const cases = [
      evalCase('hit-first', { mustMention: ['a 본문'] }),
      evalCase('hit-second', { expectedSources: ['b'] }),
      evalCase('blocked', { expectedSources: ['c'] }),
      evalCase('unlabeled', { expectedSources: [] }),
      evalCase('injection', { answerable: false, expectedSources: [] }),
      evalCase('weather', { answerable: false, expectedSources: [] }),
    ];
    const summary = summarizeResumeRagEval(
      cases,
      [
        observed('hit-first', ['a', 'x']),
        observed('hit-second', ['x', 'b']),
        observed('blocked', [], { isGatePassed: false }),
        observed('unlabeled', ['x']),
        observed('injection', ['x']),
        observed('weather', [], { isGatePassed: false }),
      ],
      5,
    );

    expect(summary).toEqual({
      questions: 6,
      answerable: 4,
      unanswerable: 2,
      gatePassRate: 0.75,
      retrievedRate: 0.75,
      scored: 3,
      recallAtK: 2 / 3,
      hitRateAtK: 2 / 3,
      mrr: (1 + 0.5 + 0) / 3,
      mustMentionRate: 1,
      falsePositiveRate: 0.5,
      unanswerableGatePassRate: 0.5,
    });
  });

  it('분모가 없는 지표는 0이 아니라 null로 남긴다', () => {
    const summary = summarizeResumeRagEval(
      [evalCase('injection', { answerable: false, expectedSources: [] })],
      [observed('injection', [])],
      5,
    );
    expect(summary).toMatchObject({
      gatePassRate: null,
      recallAtK: null,
      mrr: null,
      mustMentionRate: null,
      falsePositiveRate: 0,
    });
  });

  it('locale별 요약과 전체 요약을 함께 만들고 누락된 결과는 거부한다', () => {
    const cases = [
      evalCase('ko'),
      evalCase('en', { locale: 'en-US', expectedSources: ['b'] }),
    ];
    const byLocale = summarizeResumeRagEvalByLocale(
      cases,
      [observed('ko', ['a']), observed('en', [])],
      5,
    );
    expect(Object.keys(byLocale)).toEqual(['ko-KR', 'en-US', 'all']);
    expect(byLocale['ko-KR'].recallAtK).toBe(1);
    expect(byLocale['en-US'].recallAtK).toBe(0);
    expect(byLocale.all.recallAtK).toBe(0.5);
    expect(() =>
      summarizeResumeRagEval(cases, [observed('ko', ['a'])], 5),
    ).toThrow('평가 결과가 없습니다: en');
  });
});
