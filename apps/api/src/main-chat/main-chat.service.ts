import { Injectable } from '@nestjs/common';
import type { ResumeRagChatRequestDto } from '../resume-rag/dto/resume-rag-chat-request.dto';
import type { ResumeRagChatResponseDto } from '../resume-rag/dto/resume-rag-chat-response.dto';
import { ResumeRagService } from '../resume-rag/resume-rag.service';

const simpleReplies = [
  {
    questions: [
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
    answers: {
      'ko-KR':
        '안녕하세요! 반가워요 👋 저는 이상민의 프로젝트와 경력을 안내해드려요. ' +
        '대표 프로젝트, 맡은 역할과 사용 기술, 문제 해결 과정과 성과, 협업 경험을 편하게 물어보세요.\n\n' +
        '예를 들면 “대표 프로젝트와 맡은 역할을 알려줘”라고 질문해보세요.',
      'en-US':
        'Hello! Nice to meet you 👋 I can introduce Sangmin Lee’s projects and career. ' +
        'Ask me about featured projects, roles and technologies, problem-solving and outcomes, or collaboration.\n\n' +
        'For example: “Tell me about a featured project and Sangmin’s role.”',
      'ja-JP':
        'こんにちは！はじめまして 👋 イ・サンミンのプロジェクや経歴をご案内します。 ' +
        '代表プロジェクト、役割と使用技術、問題解決と成果、協業経験について気軽に聞いてください。\n\n' +
        '例：「代表プロジェクトと担当した役割を教えて」',
    },
  },
  {
    questions: [
      '고마워',
      '감사해',
      '감사합니다',
      'thanks',
      'thank you',
      'ありがとう',
      'ありがとうございます',
    ],
    answers: {
      'ko-KR': '천만에요! 다른 프로젝트나 경력도 궁금하면 이어서 물어보세요.',
      'en-US':
        'You’re welcome! Ask anytime if you want to know more about another project or role.',
      'ja-JP':
        'どういたしまして！ほかのプロジェクトや経歴についても気軽に聞いてください。',
    },
  },
  {
    questions: [
      '뭘 물어볼 수 있어',
      '뭐 물어볼 수 있어',
      '무엇을 물어볼 수 있어',
      '도와줘',
      'help',
      'what can i ask',
      '何を聞けますか',
    ],
    answers: {
      'ko-KR':
        '프로젝트별 역할과 사용 기술, 문제 해결 과정, 성과, 협업 경험을 물어볼 수 있어요.',
      'en-US':
        'You can ask about project roles, technologies, problem-solving, outcomes, and collaboration.',
      'ja-JP':
        'プロジェクトでの役割、使用技術、問題解決、成果、協業経験について質問できます。',
    },
  },
] as const;

const normalizeSimpleQuestion = (question: string): string =>
  question
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const getSimpleReply = (
  question: string,
  locale: string,
): string | undefined => {
  const normalizedQuestion = normalizeSimpleQuestion(question);
  const reply = simpleReplies.find(({ questions }) =>
    questions.some(
      (candidate) => normalizeSimpleQuestion(candidate) === normalizedQuestion,
    ),
  );

  if (!reply) return undefined;

  return (
    reply.answers[locale as keyof typeof reply.answers] ??
    reply.answers['ko-KR']
  );
};

@Injectable()
export class MainChatService {
  constructor(private readonly resumeRagService: ResumeRagService) {}

  answer(request: ResumeRagChatRequestDto): Promise<ResumeRagChatResponseDto> {
    const simpleReply = getSimpleReply(request.question, request.locale);
    if (simpleReply) {
      return Promise.resolve({
        answer: simpleReply,
        grounded: false,
        sources: [],
      });
    }

    return this.resumeRagService.answer(request, { recordQuestion: false });
  }
}
