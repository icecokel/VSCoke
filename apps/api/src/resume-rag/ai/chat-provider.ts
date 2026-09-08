import type { ResumeChatHistoryMessage } from '../resume-chat-history';
import type { ChatChannel } from '../chat-definition';
import type { RetrievedResumeChunk } from '../resume-rag-retriever.service';

export type ChatAnswerRequest = {
  channel?: ChatChannel;
  task?: 'rewrite-query';
  history?: ResumeChatHistoryMessage[];
  question: string;
  locale: string;
  contexts: RetrievedResumeChunk[];
};

export type ChatProvider = {
  answer(request: ChatAnswerRequest): Promise<string>;
};

export const RESUME_RAG_CHAT_PROVIDER = 'RESUME_RAG_CHAT_PROVIDER';
