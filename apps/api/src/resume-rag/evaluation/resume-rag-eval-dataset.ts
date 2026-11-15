// 이력 질문 RAG 검색 평가의 골든 질문 세트와 대리 corpus 형식을 해석·검증한다.
// 원본 데이터는 apps/api/test/rag-eval/에 두고, 형식 검증은 모델 없이 단위 테스트로 확인한다.

export type ResumeRagEvalCase = {
  id: string;
  topicId: string;
  origin: string;
  locale: string;
  resumeKey: string;
  question: string;
  answerable: boolean;
  expectedSources: string[];
  mustMention: string[];
};

export type ResumeRagEvalCorpusDetail = {
  slug: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  content: string;
};

export type ResumeRagEvalCorpusExperience = {
  key: string;
  company: string;
  publicTitle: string;
  bullets: { key: string; text: string }[];
};

export type ResumeRagEvalCorpus = {
  projectDetails: ResumeRagEvalCorpusDetail[];
  experiences: ResumeRagEvalCorpusExperience[];
};

// 평가 key: 상세는 운영과 같은 원문 key, 불렛은 corpus key를 쓴다.
// 운영 불렛 key의 UUID는 실행마다 정해지므로 corpus key로 결과를 되돌려 비교한다.
export const detailEvalKey = (slug: string): string => `resume-detail/${slug}`;
export const bulletEvalKey = (key: string): string => `career-bullet/${key}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isText);

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const parseResumeRagEvalCorpus = (
  value: unknown,
): ResumeRagEvalCorpus => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.projectDetails) ||
    !Array.isArray(value.experiences)
  )
    throw new Error('corpus는 projectDetails와 experiences 배열이 필요합니다.');
  const projectDetails = value.projectDetails.map((detail, index) => {
    if (
      !isRecord(detail) ||
      !isText(detail.slug) ||
      !slugPattern.test(detail.slug) ||
      !isText(detail.title) ||
      !isText(detail.content)
    )
      throw new Error(`corpus 상세 ${index}의 형식이 올바르지 않습니다.`);
    return {
      slug: detail.slug,
      title: detail.title,
      startDate: isText(detail.startDate) ? detail.startDate : null,
      endDate: isText(detail.endDate) ? detail.endDate : null,
      content: detail.content,
    };
  });
  const experiences = value.experiences.map((experience, index) => {
    if (
      !isRecord(experience) ||
      !isText(experience.key) ||
      !isText(experience.company) ||
      !isText(experience.publicTitle) ||
      !Array.isArray(experience.bullets) ||
      experience.bullets.length === 0
    )
      throw new Error(`corpus 경험 ${index}의 형식이 올바르지 않습니다.`);
    return {
      key: experience.key,
      company: experience.company,
      publicTitle: experience.publicTitle,
      bullets: experience.bullets.map((bullet, bulletIndex) => {
        if (!isRecord(bullet) || !isText(bullet.key) || !isText(bullet.text))
          throw new Error(
            `corpus 경험 ${index} 불렛 ${bulletIndex}의 형식이 올바르지 않습니다.`,
          );
        return { key: bullet.key, text: bullet.text };
      }),
    };
  });
  const keys = [
    ...projectDetails.map((detail) => detailEvalKey(detail.slug)),
    ...experiences.map((experience) => `experience/${experience.key}`),
    ...experiences.flatMap((experience) =>
      experience.bullets.map((bullet) => bulletEvalKey(bullet.key)),
    ),
  ];
  const duplicated = keys.find((key, index) => keys.indexOf(key) !== index);
  if (duplicated) throw new Error(`corpus key가 중복됩니다: ${duplicated}`);
  return { projectDetails, experiences };
};

// mustMention 검증용 평가 key별 본문. 실제 검색 원문의 제목·근거 문장 조합은 색인 경로가 만든다.
export const listResumeRagEvalCorpusTexts = (
  corpus: ResumeRagEvalCorpus,
): Map<string, string> =>
  new Map([
    ...corpus.projectDetails.map((detail): [string, string] => [
      detailEvalKey(detail.slug),
      `${detail.title}\n${detail.content}`,
    ]),
    ...corpus.experiences.flatMap((experience) =>
      experience.bullets.map((bullet): [string, string] => [
        bulletEvalKey(bullet.key),
        `${experience.company} · ${experience.publicTitle}\n${bullet.text}`,
      ]),
    ),
  ]);

// 주제 하나를 locale별 평가 문항으로 펼친다. 같은 주제는 모든 locale에서 같은 정답을 공유한다.
export const expandResumeRagGoldenSet = (
  value: unknown,
): ResumeRagEvalCase[] => {
  if (
    !isRecord(value) ||
    !isText(value.resumeKey) ||
    !isTextList(value.locales) ||
    value.locales.length === 0 ||
    !Array.isArray(value.topics)
  )
    throw new Error('골든 세트는 resumeKey, locales, topics가 필요합니다.');
  const resumeKey = value.resumeKey;
  const locales = value.locales;
  const topics = value.topics;
  const topicIds = new Set<string>();
  return topics.flatMap((topic, index): ResumeRagEvalCase[] => {
    if (
      !isRecord(topic) ||
      !isText(topic.id) ||
      !isText(topic.origin) ||
      typeof topic.answerable !== 'boolean' ||
      !isTextList(topic.expectedSources) ||
      (topic.mustMention !== undefined && !isTextList(topic.mustMention)) ||
      !isRecord(topic.questions)
    )
      throw new Error(`골든 주제 ${index}의 형식이 올바르지 않습니다.`);
    const topicId = topic.id;
    const origin = topic.origin;
    const answerable = topic.answerable;
    const expectedSources: string[] = topic.expectedSources;
    const mustMention = isTextList(topic.mustMention) ? topic.mustMention : [];
    const questions = topic.questions;
    if (topicIds.has(topicId))
      throw new Error(`골든 주제 id가 중복됩니다: ${topicId}`);
    topicIds.add(topicId);
    if (!answerable && expectedSources.length > 0)
      throw new Error(`답할 수 없는 주제에 정답 출처가 있습니다: ${topicId}`);
    return locales.map((locale) => {
      const question = questions[locale];
      if (!isText(question))
        throw new Error(`${topicId}에 ${locale} 질문이 없습니다.`);
      return {
        id: `${topicId}.${locale}`,
        topicId,
        origin,
        locale,
        resumeKey,
        question,
        answerable,
        expectedSources: [...expectedSources],
        mustMention: [...mustMention],
      };
    });
  });
};

// 정답 출처가 corpus에 있고, 필수 언급어가 정답 출처 본문 중 하나에 실제로 있는지 확인한다.
export const findResumeRagGoldenSetIssues = (
  cases: ResumeRagEvalCase[],
  corpusTexts: Map<string, string>,
): string[] =>
  cases.flatMap((item) => [
    ...item.expectedSources
      .filter((key) => !corpusTexts.has(key))
      .map((key) => `${item.id}: corpus에 없는 정답 출처 ${key}`),
    ...item.mustMention
      .filter(
        (term) =>
          !item.expectedSources.some((key) =>
            corpusTexts.get(key)?.toLowerCase().includes(term.toLowerCase()),
          ),
      )
      .map((term) => `${item.id}: 정답 출처 본문에 없는 필수 언급어 ${term}`),
  ]);
