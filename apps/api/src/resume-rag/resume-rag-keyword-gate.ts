export type ResumeRagKeywordGroup = {
  id: string;
  weight: number;
  aliases: readonly string[];
  searchExpansions?: readonly string[];
};

const MIN_RESUME_RAG_KEYWORD_SCORE = 2;

const KOREAN_PARTICLES = [
  '으로서',
  '으로써',
  '에게서',
  '한테서',
  '에서',
  '에게',
  '한테',
  '까지',
  '부터',
  '처럼',
  '보다',
  '으로',
  '로',
  '와',
  '과',
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
  '도',
  '만',
  '야',
];

const STOP_WORDS = new Set([
  '뭐',
  '무엇',
  '뭐야',
  '알려줘',
  '알려',
  '설명',
  '어떤',
  '어느',
  'the',
  'a',
  'an',
  'is',
  'are',
  'what',
  'which',
  'about',
  'tell',
  'me',
]);

export const RESUME_RAG_KEYWORD_GROUPS: readonly ResumeRagKeywordGroup[] = [
  {
    id: 'oprimed',
    weight: 3,
    aliases: ['oprimed', 'optivis', '오프리메드', '오프리', '오프티비스'],
  },
  {
    id: 'company-code-crayon',
    weight: 3,
    aliases: [
      'code crayon',
      'codecrayon',
      '코드크레용',
      'sellectors',
      '셀렉터스',
      'shortime',
      '숏타임',
      '쇼타임',
    ],
  },
  {
    id: 'company-allofthem',
    weight: 3,
    aliases: ['all of them', 'allofthem', '올오브뎀', 'aig'],
  },
  {
    id: 'company-datalogics',
    weight: 3,
    aliases: ['datalogics', '데이터로직스', '국무조정실'],
  },
  {
    id: 'healthcare-domain',
    weight: 3,
    aliases: [
      '의료',
      '임상',
      '환자',
      '질병',
      '약물',
      '검사',
      'healthcare',
      'clinical',
      'patient',
      'clinical background',
      'tsi',
      'trp',
      'drd',
      'ats',
    ],
  },
  {
    id: 'frontend',
    weight: 2,
    aliases: [
      '프론트엔드',
      'frontend',
      'react',
      'next.js',
      'nextjs',
      'typescript',
      '상태관리',
      'ui',
      'hook',
      'component',
      '컴포넌트',
      '브라우저',
      'css',
      'sass',
      'swr',
      'jotai',
      'mui',
      'data grid',
    ],
  },
  {
    id: 'product-engineering',
    weight: 2,
    aliases: [
      '제품',
      '프로덕트',
      '서비스',
      '문제 해결',
      '문제해결',
      '요구사항',
      '기획',
      '설계',
      '초기 설계',
      '구조',
      '구조화',
      '표준화',
      '리팩토링',
      '품질',
      'qa',
      '사용성',
      'ux',
      '디자인 시스템',
      '프론트엔드 구조',
      '유지보수성',
    ],
  },
  {
    id: 'delivery',
    weight: 2,
    aliases: [
      'ci/cd',
      'cicd',
      '배포',
      '테스트',
      'playwright',
      'docker',
      'github actions',
      '빌드',
      '검증',
      'typecheck',
      'pre-push',
      'husky',
      'runner',
      'e2e',
      '회귀',
      '브라우저 테스트',
      '자동 검증',
      '테스트 베드',
    ],
  },
  {
    id: 'product-data-flow',
    weight: 2,
    aliases: [
      '분석',
      '차트',
      '데이터',
      '조회',
      '저장',
      '업로드',
      '다운로드',
      '유효성',
      '유효성 검사',
      '캐시',
      '상태',
      '상태 관리',
      '폼',
      'api 연동',
      'api 연결',
      '서버 상태',
      '로딩',
      '에러',
      '타입 안정성',
      '타입 검사',
      '타입 모델링',
      '도메인 모델',
      '페이지네이션',
      '필터',
      'tanstack query',
      'zustand',
      'react hook form',
      'echarts',
      'plotly',
      'swr',
      'jotai',
    ],
  },
  {
    id: 'automation-ai',
    weight: 2,
    aliases: [
      '자동화',
      'ai',
      'llm',
      'codex',
      'bedrock',
      'openai',
      'translate',
      '번역',
      '자막',
      '프롬프트',
      '검수',
      '생산성',
      'pr 리뷰',
      '업무 자동화',
      '콘텐츠 운영',
      '콘텐츠 확인',
      '운영 도구',
      '관리 도구',
      '작업 생산성',
      '팀 리소스',
      '크롤링',
      '무단 도용',
      'vtt',
      'hls',
    ],
  },
  {
    id: 'commerce-operations',
    weight: 2,
    aliases: [
      '커머스',
      '백오피스',
      '운영자',
      'admin',
      '어드민',
      '관리자',
      '관리 화면',
      '관리 사이트',
      '주문',
      '상품',
      '셀러',
      '정산',
      '이벤트',
      '문의',
      '테이블',
      '다이얼로그',
      '드래그',
      '내보내기',
      '이커머스',
      '엑셀',
      'excel',
      'csv',
      'export',
      '매출',
      '배너',
      '테마',
    ],
  },
  {
    id: 'mobile-webview',
    weight: 2,
    aliases: [
      '모바일',
      '웹뷰',
      'webview',
      'playground',
      '딥링크',
      'deep link',
      'sdk',
      '앱 배포',
      '운세',
      '게임형',
      '콘텐츠',
      'safe area',
      'flutter bridge',
      'bridge',
      '앱 연동',
      '마케팅 연동',
      '랭킹',
      '결과 제출',
      '사운드',
      '배너',
    ],
  },
  {
    id: 'performance',
    weight: 2,
    aliases: [
      '성능',
      '최적화',
      'lcp',
      'speed index',
      'lighthouse',
      '렌더링',
      'webp',
      '이미지',
      'chrome',
      'safari',
      'webkit',
      '반응형',
      '호환성',
      'web vitals',
      'ttfb',
      'cache-control',
      'cache control',
      '응답 속도',
      '성능 튜닝',
    ],
  },
  {
    id: 'operations-infra',
    weight: 2,
    aliases: [
      '운영',
      '유지보수',
      '장애',
      '장애 대응',
      'api',
      '보안',
      '인프라',
      '마이그레이션',
      '데이터베이스',
      'windows',
      '매뉴얼',
      '모니터링',
      '사용자 영향',
      '수정 범위',
      '운영 안정성',
      '운영팀',
      '오류',
      '변경 요청',
      '콜센터',
    ],
  },
  {
    id: 'career-intent',
    weight: 2,
    aliases: [
      '이력',
      '경력',
      '커리어',
      '업무',
      '프로젝트',
      '경험',
      '강점',
      '성과',
      '기여',
      'resume',
      'career',
      'experience',
      'strength',
      'project',
    ],
  },
];

export const SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP: Record<
  string,
  readonly string[]
> = {
  oprimed: [
    'oprimed',
    'optivis',
    '오프리메드',
    '오프리',
    '오프티비스',
    '의료',
    '임상',
  ],
  'company-code-crayon': [
    'code crayon',
    'codecrayon',
    '코드크레용',
    'sellectors',
    '셀렉터스',
    'shortime',
    '숏타임',
    '쇼타임',
    '커머스',
    '백오피스',
    '웹뷰',
    '번역',
    '자동화',
    '콘텐츠 운영',
    '운영 도구',
  ],
  'company-allofthem': [
    'all of them',
    'allofthem',
    '올오브뎀',
    'aig',
    '보험',
    '가입',
    '성능',
    'chrome',
    'safari',
    '결제',
    '관리자',
  ],
  'company-datalogics': [
    'datalogics',
    '데이터로직스',
    '국무조정실',
    '운영',
    '유지보수',
    '장애',
    'api',
    '보안',
    '인프라',
  ],
  'healthcare-domain': [
    '의료',
    '임상',
    '환자',
    '질병',
    '약물',
    '검사',
    '분석',
    '차트',
    '데이터',
    'clinical background',
    'tsi',
    'trp',
    'drd',
    'ats',
    'healthcare',
    'clinical',
    'patient',
  ],
  frontend: [
    '프론트엔드',
    'frontend',
    'front end',
    'react',
    'next.js',
    'nextjs',
    'next',
    'typescript',
    '상태관리',
    'ui',
    'hook',
    'component',
    '컴포넌트',
    '브라우저',
    '화면',
    '상태',
    '폼',
    'css',
    'sass',
    'swr',
    'jotai',
    'mui',
    'data grid',
  ],
  'product-engineering': [
    '제품',
    '프로덕트',
    '서비스',
    '문제 해결',
    '문제해결',
    '요구사항',
    '기획',
    '설계',
    '초기 설계',
    '구조',
    '구조화',
    '표준화',
    '리팩토링',
    '품질',
    'qa',
    '사용성',
    'ux',
    '디자인 시스템',
    '프론트엔드 구조',
    '유지보수성',
    '흐름',
    '기준',
    '개선',
    '전환',
  ],
  delivery: [
    'ci/cd',
    'cicd',
    'ci',
    'cd',
    '배포',
    '검증',
    '빌드',
    '테스트',
    'playwright',
    'docker',
    'github actions',
    'github',
    'actions',
    'workflow',
    'workflows',
    'runner',
    'typecheck',
    'pre-push',
    'husky',
    'shell script',
    'e2e',
    '회귀',
    '브라우저 테스트',
    '자동 검증',
    '테스트 베드',
  ],
  'product-data-flow': [
    '분석',
    '차트',
    '데이터',
    '조회',
    '저장',
    '업로드',
    '다운로드',
    '유효성',
    '유효성 검사',
    '캐시',
    '상태',
    '상태 관리',
    '폼',
    '입력',
    '결과',
    '재조회',
    'api 연동',
    'api 연결',
    '서버 상태',
    '로딩',
    '에러',
    '타입 안정성',
    '타입 검사',
    '타입 모델링',
    '도메인 모델',
    '페이지네이션',
    '필터',
    'tanstack query',
    'zustand',
    'react hook form',
    'echarts',
    'plotly',
    'swr',
    'jotai',
  ],
  'automation-ai': [
    '자동화',
    'ai',
    'llm',
    'codex',
    'bedrock',
    'openai',
    'translate',
    '번역',
    '자막',
    '프롬프트',
    '검수',
    '생산성',
    'pr 리뷰',
    '리소스',
    'cli',
    '웹 도구',
    '관리 도구',
    'google cloud translate',
    '업무 자동화',
    '콘텐츠 운영',
    '콘텐츠 확인',
    '운영 도구',
    '작업 생산성',
    '팀 리소스',
    '크롤링',
    '무단 도용',
    'vtt',
    'hls',
  ],
  'commerce-operations': [
    '커머스',
    '백오피스',
    '운영자',
    'admin',
    '어드민',
    '관리자',
    '관리 화면',
    '관리 사이트',
    '주문',
    '상품',
    '셀러',
    '정산',
    '이벤트',
    '문의',
    '테이블',
    '다이얼로그',
    '드래그',
    '내보내기',
    '공통',
    '컴포넌트',
    '고객용',
    '이커머스',
    '엑셀',
    'excel',
    'csv',
    'export',
    '매출',
    '배너',
    '테마',
    '페이지네이션',
    '필터',
  ],
  'mobile-webview': [
    '모바일',
    '웹뷰',
    'webview',
    'playground',
    '딥링크',
    'deep link',
    'sdk',
    '앱 배포',
    '앱',
    '배포',
    '운세',
    '게임형',
    '게임',
    '콘텐츠',
    '이벤트',
    '업데이트',
    'safe area',
    'flutter bridge',
    'bridge',
    '앱 연동',
    '마케팅 연동',
    '랭킹',
    '결과 제출',
    '사운드',
    '배너',
  ],
  performance: [
    '성능',
    '최적화',
    'lcp',
    'speed index',
    'lighthouse',
    '렌더링',
    'webp',
    '이미지',
    'chrome',
    'safari',
    'webkit',
    '반응형',
    '호환성',
    '브라우저',
    '가입',
    '표시',
    'web vitals',
    'ttfb',
    'cache-control',
    'cache control',
    '응답 속도',
    '성능 튜닝',
    'cache',
    'swr',
  ],
  'operations-infra': [
    '운영',
    '유지보수',
    '장애',
    '장애 대응',
    'api',
    '보안',
    '인프라',
    '마이그레이션',
    '데이터베이스',
    'windows',
    '매뉴얼',
    '모니터링',
    '재현',
    '수정',
    '이슈',
    '운영팀',
    '사용자 영향',
    '수정 범위',
    '운영 안정성',
    '오류',
    '변경 요청',
    '콜센터',
  ],
  'career-intent': [
    '이력',
    '경력',
    '커리어',
    '업무',
    '프로젝트',
    '경험',
    '강점',
    '성과',
    '기여',
    'resume',
    'career',
    'experience',
    'strength',
    'project',
    'impact',
  ],
};

const OUT_OF_SCOPE_ANSWER_BY_LOCALE: Record<string, string> = {
  'ko-KR':
    '이 질문은 제 이력 범위를 벗어난 것 같아요. 프로젝트, 기술 경험, 업무 성과, 강점처럼 이력과 관련된 내용으로 다시 물어봐 주세요.',
  'en-US':
    'This question seems outside the scope of my resume. Please ask about resume-related topics such as projects, technical experience, work impact, or strengths.',
  'ja-JP':
    'この質問は私の履歴の範囲から外れているようです。プロジェクト、技術経験、業務成果、強みなど履歴に関連する内容で質問してください。',
};

const normalizeKeywordText = (value: string): string =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[._/+-]+/g, ' ')
    .replace(/[^\p{L}\p{N}#]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeSearchText = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/([a-z0-9])(\p{Script=Hangul})/gu, '$1 $2')
    .replace(/(\p{Script=Hangul})([a-z0-9])/gu, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeResumeRagSearchText = normalizeSearchText;

const compactSearchText = (text: string): string =>
  normalizeSearchText(text).replaceAll(' ', '');

const stripKoreanParticle = (token: string): string => {
  for (const particle of KOREAN_PARTICLES) {
    if (token.length > particle.length + 1 && token.endsWith(particle)) {
      return token.slice(0, -particle.length);
    }
  }

  return token;
};

const addToken = (tokens: Set<string>, rawToken: string): void => {
  const token = stripKoreanParticle(rawToken);
  if (!token || token.length < 2 || STOP_WORDS.has(token)) return;
  tokens.add(token);
};

const addTokensFromText = (tokens: Set<string>, text: string): void => {
  for (const rawToken of normalizeSearchText(text).split(/\s+/)) {
    addToken(tokens, rawToken);
  }
};

const keywordAliasMatches = (question: string, alias: string): boolean => {
  const normalizedQuestion = normalizeSearchText(question);
  const normalizedAlias = normalizeSearchText(alias);
  if (!normalizedAlias) return false;

  return (
    normalizedQuestion.includes(normalizedAlias) ||
    compactSearchText(question).includes(compactSearchText(alias))
  );
};

export const calculateResumeRagKeywordScore = (
  question: string,
  groups: readonly ResumeRagKeywordGroup[] = RESUME_RAG_KEYWORD_GROUPS,
): number => {
  const normalizedQuestion = normalizeKeywordText(question);
  if (!normalizedQuestion) return 0;

  return groups.reduce((score, group) => {
    const matched = group.aliases.some((alias) =>
      keywordAliasMatches(question, alias),
    );

    return matched ? score + group.weight : score;
  }, 0);
};

export const isResumeRagQuestionInScope = (
  question: string,
  groups: readonly ResumeRagKeywordGroup[] = RESUME_RAG_KEYWORD_GROUPS,
): boolean =>
  calculateResumeRagKeywordScore(question, groups) >=
  MIN_RESUME_RAG_KEYWORD_SCORE;

export const createResumeRagSearchTokens = (
  text: string,
  groups: readonly ResumeRagKeywordGroup[] = RESUME_RAG_KEYWORD_GROUPS,
): string[] => {
  const uniqueTokens = new Set<string>();

  for (const rawToken of normalizeSearchText(text).split(/\s+/)) {
    addToken(uniqueTokens, rawToken);
  }

  for (const group of groups) {
    const matched = group.aliases.some((alias) =>
      keywordAliasMatches(text, alias),
    );
    if (!matched) continue;

    const expansions =
      group.searchExpansions ??
      SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP[group.id] ??
      group.aliases;
    for (const expansion of expansions) {
      addTokensFromText(uniqueTokens, expansion);
    }
  }

  return [...uniqueTokens];
};

export const getResumeRagOutOfScopeAnswer = (locale: string): string =>
  OUT_OF_SCOPE_ANSWER_BY_LOCALE[locale] ??
  OUT_OF_SCOPE_ANSWER_BY_LOCALE['ko-KR'];
