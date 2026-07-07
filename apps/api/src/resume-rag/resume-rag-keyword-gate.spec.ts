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

  it('allows resume domain keywords found in source documents', () => {
    expect(isResumeRagQuestionInScope('웹뷰는 뭘 했어?')).toBe(true);
    expect(isResumeRagQuestionInScope('자막 번역은?')).toBe(true);
    expect(isResumeRagQuestionInScope('커머스 백오피스?')).toBe(true);
    expect(isResumeRagQuestionInScope('성능 최적화?')).toBe(true);
    expect(isResumeRagQuestionInScope('장애 대응?')).toBe(true);
    expect(isResumeRagQuestionInScope('제품 문제 해결')).toBe(true);
    expect(isResumeRagQuestionInScope('UX 사용성')).toBe(true);
    expect(isResumeRagQuestionInScope('타입 모델링')).toBe(true);
    expect(isResumeRagQuestionInScope('Web Vitals')).toBe(true);
    expect(isResumeRagQuestionInScope('어드민 관리자 화면')).toBe(true);
  });

  it('blocks unrelated questions before AI processing', () => {
    expect(isResumeRagQuestionInScope('오늘 날씨 어때?')).toBe(false);
    expect(isResumeRagQuestionInScope('비트코인 가격 알려줘')).toBe(false);
  });

  it('returns a fixed localized out-of-scope message', () => {
    expect(getResumeRagOutOfScopeAnswer('ko-KR')).toBe(
      '이 질문은 제 이력 범위를 벗어난 것 같아요. 프로젝트, 기술 경험, 업무 성과, 강점처럼 이력과 관련된 내용으로 다시 물어봐 주세요.',
    );
    expect(getResumeRagOutOfScopeAnswer('en-US')).toBe(
      'This question seems outside the scope of my resume. Please ask about resume-related topics such as projects, technical experience, work impact, or strengths.',
    );
    expect(getResumeRagOutOfScopeAnswer('ja-JP')).toBe(
      'この質問は私の履歴の範囲から外れているようです。プロジェクト、技術経験、業務成果、強みなど履歴に関連する内容で質問してください。',
    );
    expect(getResumeRagOutOfScopeAnswer('unknown')).toBe(
      getResumeRagOutOfScopeAnswer('ko-KR'),
    );
  });
});
