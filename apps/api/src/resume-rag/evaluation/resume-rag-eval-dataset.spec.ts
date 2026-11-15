import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  expandResumeRagGoldenSet,
  findResumeRagGoldenSetIssues,
  listResumeRagEvalCorpusTexts,
  parseResumeRagEvalCorpus,
} from './resume-rag-eval-dataset';

const fixtureDirectory = join(__dirname, '..', '..', '..', 'test', 'rag-eval');
const readFixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(fixtureDirectory, name), 'utf8'));

const topic = (overrides: Record<string, unknown> = {}) => ({
  id: 'topic',
  origin: 'recruiter',
  answerable: true,
  expectedSources: ['resume-detail/sample'],
  questions: { 'ko-KR': '질문', 'en-US': 'Question' },
  ...overrides,
});
const goldenSet = (topics: unknown[]) => ({
  resumeKey: 'fe',
  locales: ['ko-KR', 'en-US'],
  topics,
});

describe('이력 질문 RAG 평가 데이터', () => {
  it('저장소의 골든 세트는 모든 정답 출처와 필수 언급어를 corpus에서 찾을 수 있다', () => {
    const corpus = parseResumeRagEvalCorpus(
      readFixture('resume-rag-eval-corpus.json'),
    );
    const cases = expandResumeRagGoldenSet(
      readFixture('resume-rag-golden-set.json'),
    );

    expect(
      findResumeRagGoldenSetIssues(cases, listResumeRagEvalCorpusTexts(corpus)),
    ).toEqual([]);
    const locales = ['ko-KR', 'en-US', 'ja-JP'];
    for (const locale of locales) {
      const localeCases = cases.filter((item) => item.locale === locale);
      expect(localeCases.filter((item) => !item.answerable).length).toBe(10);
      expect(
        localeCases.filter((item) => item.origin === 'site-suggestion').length,
      ).toBe(22);
    }
    expect(new Set(cases.map((item) => item.id)).size).toBe(cases.length);
  });

  it('주제를 locale별 문항으로 펼치고 정답을 공유한다', () => {
    const cases = expandResumeRagGoldenSet(
      goldenSet([topic({ mustMention: ['SDK'] })]),
    );
    expect(cases).toEqual([
      expect.objectContaining({
        id: 'topic.ko-KR',
        locale: 'ko-KR',
        question: '질문',
        resumeKey: 'fe',
        expectedSources: ['resume-detail/sample'],
        mustMention: ['SDK'],
      }),
      expect.objectContaining({ id: 'topic.en-US', question: 'Question' }),
    ]);
  });

  it('locale 질문 누락·중복 주제·정답이 있는 답변 불가 주제를 거부한다', () => {
    expect(() =>
      expandResumeRagGoldenSet(
        goldenSet([topic({ questions: { 'ko-KR': '질문' } })]),
      ),
    ).toThrow('topic에 en-US 질문이 없습니다.');
    expect(() =>
      expandResumeRagGoldenSet(goldenSet([topic(), topic()])),
    ).toThrow('골든 주제 id가 중복됩니다: topic');
    expect(() =>
      expandResumeRagGoldenSet(goldenSet([topic({ answerable: false })])),
    ).toThrow('답할 수 없는 주제에 정답 출처가 있습니다: topic');
  });

  it('corpus에 없는 정답 출처와 본문에 없는 필수 언급어를 보고한다', () => {
    const corpus = parseResumeRagEvalCorpus({
      projectDetails: [
        { slug: 'sample', title: '샘플', content: 'CDN SDK를 만들었습니다.' },
      ],
      experiences: [
        {
          key: 'sample-experience',
          company: '샘플 회사',
          publicTitle: '샘플 프로젝트',
          bullets: [{ key: 'sample-bullet', text: '배포를 자동화했습니다.' }],
        },
      ],
    });
    const cases = expandResumeRagGoldenSet(
      goldenSet([
        topic({
          expectedSources: [
            'resume-detail/sample',
            'career-bullet/missing-bullet',
          ],
          mustMention: ['sdk', 'Playwright'],
        }),
      ]),
    );
    expect(
      findResumeRagGoldenSetIssues(
        cases.slice(0, 1),
        listResumeRagEvalCorpusTexts(corpus),
      ),
    ).toEqual([
      'topic.ko-KR: corpus에 없는 정답 출처 career-bullet/missing-bullet',
      'topic.ko-KR: 정답 출처 본문에 없는 필수 언급어 Playwright',
    ]);
  });

  it('corpus의 key 중복을 거부한다', () => {
    expect(() =>
      parseResumeRagEvalCorpus({
        projectDetails: [],
        experiences: [
          {
            key: 'experience',
            company: '회사',
            publicTitle: '프로젝트',
            bullets: [
              { key: 'same', text: '첫 문장' },
              { key: 'same', text: '두 번째 문장' },
            ],
          },
        ],
      }),
    ).toThrow('corpus key가 중복됩니다: career-bullet/same');
  });
});
