import type { ResumeChatHistoryMessage } from '../resume-chat-history';
import type { ChatChannel } from '../chat-definition';
import type { RetrievedResumeChunk } from '../resume-rag-retriever.service';

export type ChatAnswerRequest = {
  channel?: ChatChannel;
  history?: ResumeChatHistoryMessage[];
  question: string;
  locale: string;
  contexts: RetrievedResumeChunk[];
};

export type ChatRewriteRequest = Omit<ChatAnswerRequest, 'contexts'>;

// 프롬프트 생성기가 두 작업을 구분하는 내부 요청이다.
export type ChatPromptRequest = ChatAnswerRequest & { task?: 'rewrite-query' };

export type ChatAnswer = {
  answer: string;
  // 모델이 전달한 근거만으로 질문에 답했다고 판단했는지
  answerable: boolean;
  // 답변에 실제로 사용한 근거의 1부터 시작하는 reference 번호. 범위 검증은 호출자가 한다.
  usedReferences: number[];
};

export type ChatProvider = {
  answer(request: ChatAnswerRequest): Promise<ChatAnswer>;
  rewriteQuery(request: ChatRewriteRequest): Promise<string>;
};

export const RESUME_RAG_CHAT_PROVIDER = 'RESUME_RAG_CHAT_PROVIDER';
