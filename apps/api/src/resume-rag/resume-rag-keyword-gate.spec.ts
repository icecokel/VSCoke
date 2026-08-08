import {
  createResumeRagSearchTokens,
  getResumeRagNoEvidenceAnswer,
} from './resume-rag-keyword-gate';

describe('resume-rag keyword search', () => {
  it('이력 키워드가 없는 질문도 검색 토큰으로 변환한다', () => {
    expect(createResumeRagSearchTokens('오늘 날씨 어때?')).toEqual(
      expect.arrayContaining(['오늘', '날씨', '어때']),
    );
  });

  it('expands project intent into retrieval tokens', () => {
    expect(createResumeRagSearchTokens('대표 포트폴리오와 담당 역할')).toEqual(
      expect.arrayContaining([
        'vscoke',
        '프로젝트',
        '포트폴리오',
        '역할',
        '기술',
        '구현',
        '개발',
      ]),
    );
  });

  it('expands latest career topics into focused search tokens', () => {
    expect(createResumeRagSearchTokens('접근성과 포커스 복원')).toEqual(
      expect.arrayContaining([
        '접근성',
        'aria',
        'focus',
        'inert',
        'axe',
        'portal',
      ]),
    );
    expect(createResumeRagSearchTokens('MCP 온보딩')).toEqual(
      expect.arrayContaining([
        'mcp',
        'llm',
        'wiki',
        'markdown',
        'codex',
        'claude',
      ]),
    );
    expect(createResumeRagSearchTokens('백엔드 로그와 요청 추적')).toEqual(
      expect.arrayContaining([
        '백엔드',
        '로그',
        'request',
        'id',
        'admin',
        'guardrail',
      ]),
    );
    expect(createResumeRagSearchTokens('개발 철학과 일하는 방식')).toEqual(
      expect.arrayContaining([
        '사용자',
        '운영자',
        '작은',
        '검증',
        'runtime',
        '협업',
      ]),
    );
    expect(createResumeRagSearchTokens('보험 가입 성능')).toEqual(
      expect.arrayContaining([
        '보험',
        '가입',
        '일본',
        'ssr',
        'lcp',
        'spring',
        's3',
      ]),
    );
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

  it('returns a fixed localized no-evidence message', () => {
    expect(getResumeRagNoEvidenceAnswer('ko-KR')).toBe(
      '이 질문은 제 이력 범위를 벗어난 것 같아요. 프로젝트, 기술 경험, 업무 성과, 강점처럼 이력과 관련된 내용으로 다시 물어봐 주세요.\n\n추천 키워드: Oprimed, 의료 도메인, CI/CD와 배포, 프론트엔드 강점',
    );
    expect(getResumeRagNoEvidenceAnswer('en-US')).toBe(
      'This question seems outside the scope of my resume. Please ask about resume-related topics such as projects, technical experience, work impact, or strengths.\n\nSuggested topics: Oprimed, healthcare domain, CI/CD and deployment, frontend strengths',
    );
    expect(getResumeRagNoEvidenceAnswer('ja-JP')).toBe(
      'この質問は私の履歴の範囲から外れているようです。プロジェクト、技術経験、業務成果、強みなど履歴に関連する内容で質問してください。\n\nおすすめのキーワード: Oprimed、医療ドメイン、CI/CDとデプロイ、フロントエンドの強み',
    );
    expect(getResumeRagNoEvidenceAnswer('unknown')).toBe(
      getResumeRagNoEvidenceAnswer('ko-KR'),
    );
  });
});
