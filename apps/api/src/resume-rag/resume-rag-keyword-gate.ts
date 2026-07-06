type ResumeRagKeywordGroup = {
  id: string;
  weight: number;
  aliases: readonly string[];
};

const MIN_RESUME_RAG_KEYWORD_SCORE = 2;

export const RESUME_RAG_KEYWORD_GROUPS: readonly ResumeRagKeywordGroup[] = [
  {
    id: 'oprimed',
    weight: 3,
    aliases: ['oprimed', 'optivis', '오프리메드', '오프리', '오프티비스'],
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

export const calculateResumeRagKeywordScore = (question: string): number => {
  const normalizedQuestion = normalizeKeywordText(question);
  if (!normalizedQuestion) return 0;

  return RESUME_RAG_KEYWORD_GROUPS.reduce((score, group) => {
    const matched = group.aliases.some((alias) =>
      normalizedQuestion.includes(normalizeKeywordText(alias)),
    );

    return matched ? score + group.weight : score;
  }, 0);
};

export const isResumeRagQuestionInScope = (question: string): boolean =>
  calculateResumeRagKeywordScore(question) >= MIN_RESUME_RAG_KEYWORD_SCORE;

export const getResumeRagOutOfScopeAnswer = (locale: string): string =>
  OUT_OF_SCOPE_ANSWER_BY_LOCALE[locale] ??
  OUT_OF_SCOPE_ANSWER_BY_LOCALE['ko-KR'];
