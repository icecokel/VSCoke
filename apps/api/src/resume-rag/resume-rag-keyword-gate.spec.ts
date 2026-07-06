import {
  getResumeRagOutOfScopeAnswer,
  isResumeRagQuestionInScope,
} from './resume-rag-keyword-gate';

describe('resume-rag keyword gate', () => {
  it('allows resume-related company and career questions', () => {
    expect(isResumeRagQuestionInScope('Oprimed에서 어떤 업무를 했어?')).toBe(
      true,
    );
    expect(isResumeRagQuestionInScope('프론트엔드 강점은 뭐야?')).toBe(true);
    expect(isResumeRagQuestionInScope('What did you build with Next.js?')).toBe(
      true,
    );
  });

  it('blocks unrelated questions before AI processing', () => {
    expect(isResumeRagQuestionInScope('오늘 날씨 어때?')).toBe(false);
    expect(isResumeRagQuestionInScope('비트코인 가격 알려줘')).toBe(false);
  });

  it('returns a fixed localized out-of-scope message', () => {
    expect(getResumeRagOutOfScopeAnswer('ko-KR')).toBe(
      '이 질문은 이력과 관련된 키워드가 없어 답변하지 않았습니다. Oprimed, 의료 도메인, 프론트엔드, CI/CD처럼 이력과 관련된 질문으로 다시 물어봐 주세요.',
    );
    expect(getResumeRagOutOfScopeAnswer('unknown')).toBe(
      getResumeRagOutOfScopeAnswer('ko-KR'),
    );
  });
});
