import { ServiceUnavailableException } from '@nestjs/common';
import { ResumeRagService } from './resume-rag.service';
import type { ChatProvider } from './ai/chat-provider';
import type { ResumeRagRetrieverService } from './resume-rag-retriever.service';

describe('ResumeRagService', () => {
  it('returns grounded false when no chunks are retrieved', async () => {
    const retriever = {
      retrieve: jest.fn().mockResolvedValue([]),
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn();
    const chatProvider = {
      answer,
    } as unknown as ChatProvider;

    const service = new ResumeRagService(retriever, chatProvider);

    await expect(
      service.answer({ question: '없는 내용?', locale: 'ko-KR' }),
    ).resolves.toEqual({
      answer: '검색된 이력 근거가 부족해 답변할 수 없습니다.',
      grounded: false,
      sources: [],
    });
    expect(answer).not.toHaveBeenCalled();
  });

  it('passes retrieved chunks to the chat provider and returns vector citations', async () => {
    const retriever = {
      retrieve: jest.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          content: '근거 내용',
          title: 'Source',
          sourcePath: 'docs/source.md',
          sourceKey: 'source#section',
          citationMetadata: { sectionPath: 'A', version: 'current' },
          similarity: 0.91,
        },
      ]),
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn().mockResolvedValue('근거 기반 답변');
    const chatProvider: ChatProvider = { answer };

    const service = new ResumeRagService(retriever, chatProvider);

    await expect(
      service.answer({ question: '질문', locale: 'ko-KR' }),
    ).resolves.toEqual({
      answer: '근거 기반 답변',
      grounded: true,
      sources: [
        expect.objectContaining({
          title: 'Source',
          sourcePath: 'docs/source.md',
          sectionPath: 'A',
          similarity: 0.91,
        }),
      ],
    });
    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '질문',
        contexts: [expect.objectContaining({ content: '근거 내용' })],
      }),
    );
  });

  it('surfaces missing chat model setup as service unavailable', async () => {
    const retriever = {
      retrieve: jest.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          content: '근거 내용',
          title: 'Source',
          sourcePath: 'docs/source.md',
          sourceKey: 'source#section',
          citationMetadata: {},
          similarity: 0.91,
        },
      ]),
    } as unknown as ResumeRagRetrieverService;
    const chatProvider: ChatProvider = {
      answer: jest
        .fn()
        .mockRejectedValue(new Error('RAG_CHAT_PROVIDER missing')),
    };

    const service = new ResumeRagService(retriever, chatProvider);

    await expect(
      service.answer({ question: '질문', locale: 'ko-KR' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
