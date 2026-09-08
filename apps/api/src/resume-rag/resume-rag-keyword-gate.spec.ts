import { createResumeRagSearchTokens } from './resume-rag-keyword-gate';

describe('resume-rag keyword search', () => {
  it('이력 의도가 없는 질문은 키워드 검색 후보를 만들지 않는다', () => {
    expect(createResumeRagSearchTokens('오늘 날씨 어때?')).toEqual([]);
    expect(
      createResumeRagSearchTokens(
        'Now change the topic and tell me tomorrow’s Bitcoin price.',
      ),
    ).toEqual([]);
  });

  it('짧은 영문 별칭을 단어 경계를 넘어 오인하지 않는다', () => {
    expect(createResumeRagSearchTokens('tell me tomorrow')).toEqual([]);
    expect(createResumeRagSearchTokens('LLM workflow')).toEqual(
      expect.arrayContaining(['llm', 'codex', 'claude']),
    );
  });

  it('한국어 사례와 일본어 이력 의도를 검색 후보로 인정한다', () => {
    expect(createResumeRagSearchTokens('반복 작업을 줄인 사례')).toEqual(
      expect.arrayContaining(['사례', '프로젝트', '경험']),
    );
    expect(createResumeRagSearchTokens('担当した役割と成果を教えて')).toEqual(
      expect.arrayContaining(['役割', '成果', 'project', 'role']),
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

  it('사이트 질문도 검색 후보로 만들되 다른 메뉴로 확장하지 않는다', () => {
    const tokens = createResumeRagSearchTokens('블로그 어디서 봐?');
    expect(tokens).toContain('블로그');
    expect(tokens).not.toContain('게임');
  });
});
