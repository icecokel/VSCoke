export type ChatChannel = 'main' | 'resume';

type ChatDefinition = {
  sourceTypes: readonly string[];
  itemTypes: readonly string[];
  contextDescription: string;
  topics: Record<string, string>;
};

export const chatDefinitions: Record<ChatChannel, ChatDefinition> = {
  main: {
    sourceTypes: ['app_resume'],
    itemTypes: ['public_resume_detail', 'public_site_guide'],
    contextDescription: 'public project details and VSCoke site guidance',
    topics: {
      'ko-KR': '대표 프로젝트와 맡은 역할, 사용 기술, 사이트 이용 방법',
      'en-US': 'featured projects, roles, technologies, and using the site',
      'ja-JP': '代表プロジェクトでの役割、使用技術、サイトの利用方法',
    },
  },
  resume: {
    sourceTypes: ['app_resume', 'resume_workspace'],
    itemTypes: [
      'current_resume_data',
      'localized_resume_messages',
      'final_resume_section',
      'raw_career_evidence',
      'public_rag_evidence',
      'wanted_mapping',
      'raw_work_unit',
    ],
    contextDescription: 'public resume, career summaries, and career evidence',
    topics: {
      'ko-KR': '경력과 담당 업무, 기술 경험, 업무 성과와 강점',
      'en-US':
        'career history, responsibilities, technical experience, impact, and strengths',
      'ja-JP': '経歴、担当業務、技術経験、業務成果、強み',
    },
  },
};

const simpleQuestions = {
  greeting: [
    '안녕',
    '안녕하세요',
    '반가워',
    '하이',
    'hi',
    'hello',
    'hey',
    'こんにちは',
    'はじめまして',
  ],
  thanks: [
    '고마워',
    '감사해',
    '감사합니다',
    'thanks',
    'thank you',
    'ありがとう',
    'ありがとうございます',
  ],
  help: [
    '뭘 물어볼 수 있어',
    '뭐 물어볼 수 있어',
    '무엇을 물어볼 수 있어',
    '도와줘',
    'help',
    'what can i ask',
    '何を聞けますか',
  ],
};

const normalizeSimpleQuestion = (question: string): string =>
  question
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const getChatSimpleReply = (
  question: string,
  locale: string,
  channel: ChatChannel,
): string | undefined => {
  const normalized = normalizeSimpleQuestion(question);
  const kind = Object.entries(simpleQuestions).find(([, questions]) =>
    questions.some(
      (candidate) => normalizeSimpleQuestion(candidate) === normalized,
    ),
  )?.[0];
  if (!kind) return undefined;

  const topics = chatDefinitions[channel].topics;
  const topic = topics[locale] ?? topics['ko-KR'];
  if (locale === 'en-US') {
    if (kind === 'thanks')
      return 'You’re welcome! Feel free to ask another question.';
    return `${kind === 'greeting' ? 'Hello! Nice to meet you 👋 ' : ''}You can ask about ${topic}.`;
  }
  if (locale === 'ja-JP') {
    if (kind === 'thanks')
      return 'どういたしまして！続けて気軽に聞いてください。';
    return `${kind === 'greeting' ? 'こんにちは！はじめまして 👋 ' : ''}${topic}について質問できます。`;
  }
  if (kind === 'thanks') return '천만에요! 궁금한 내용을 이어서 물어보세요.';
  return `${kind === 'greeting' ? '안녕하세요! 반가워요 👋 ' : ''}${topic}을 물어볼 수 있어요.`;
};

export const getChatNoEvidenceAnswer = (
  locale: string,
  channel: ChatChannel,
): string => {
  const topics = chatDefinitions[channel].topics;
  const topic = topics[locale] ?? topics['ko-KR'];
  if (locale === 'en-US')
    return `I couldn't find evidence for this question in this chat's public sources. Please ask about ${topic}.`;
  if (locale === 'ja-JP')
    return `このチャットの公開資料では質問の根拠を確認できませんでした。${topic}について質問してください。`;
  return `이 채팅의 공개 자료에서 질문에 답할 근거를 찾지 못했어요. ${topic}에 대해 물어봐 주세요.`;
};
