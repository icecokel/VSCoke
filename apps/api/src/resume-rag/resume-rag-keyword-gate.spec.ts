import {
  createResumeRagSearchTokens,
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

  it('allows compact variants of multi-word resume keywords', () => {
    expect(isResumeRagQuestionInScope('타입모델링')).toBe(true);
    expect(isResumeRagQuestionInScope('webvitals')).toBe(true);
  });

  it('allows keywords from the latest imported resume evidence', () => {
    expect(isResumeRagQuestionInScope('디자인 토큰 전환 범위')).toBe(true);
    expect(isResumeRagQuestionInScope('이미지 최적화 전송량 절감')).toBe(true);
    expect(isResumeRagQuestionInScope('작업별 캐시와 결과 복원')).toBe(true);
    expect(isResumeRagQuestionInScope('PDF 페이지 분할')).toBe(true);
    expect(isResumeRagQuestionInScope('Web Audio 화면 이탈 대응')).toBe(true);
    expect(isResumeRagQuestionInScope('GA4 행동 이벤트')).toBe(true);
    expect(isResumeRagQuestionInScope('게임 결과 중복 입력 제어')).toBe(true);
  });

  it('expands latest resume evidence keywords into focused search tokens', () => {
    expect(
      createResumeRagSearchTokens('디자인 토큰과 아이콘 레지스트리'),
    ).toEqual(
      expect.arrayContaining(['디자인', '토큰', '아이콘', 'svg', '컴포넌트']),
    );
    expect(createResumeRagSearchTokens('이미지 최적화 artifact hash')).toEqual(
      expect.arrayContaining(['webp', 'artifact', 'hash', '전송량', '검증']),
    );
    expect(createResumeRagSearchTokens('작업별 캐시와 결과 복원')).toEqual(
      expect.arrayContaining(['task', '캐시', '복원', '새로고침', '재진입']),
    );
    expect(createResumeRagSearchTokens('PDF 페이지 분할')).toEqual(
      expect.arrayContaining(['pdf', 'html', '페이지', '분할', '다운로드']),
    );
    expect(createResumeRagSearchTokens('Web Audio 화면 이탈')).toEqual(
      expect.arrayContaining([
        'web',
        'audio',
        'webkit',
        'safari',
        '오디오',
        '화면',
      ]),
    );
    expect(createResumeRagSearchTokens('GA4 행동 이벤트')).toEqual(
      expect.arrayContaining(['ga4', 'gtm', '상품', '구매', '환불']),
    );
    expect(createResumeRagSearchTokens('게임 결과 중복 입력')).toEqual(
      expect.arrayContaining(['게임', '점수', '중복', '입력', '결과', '제출']),
    );
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
