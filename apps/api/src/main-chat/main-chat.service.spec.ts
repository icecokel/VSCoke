import { ServiceUnavailableException } from '@nestjs/common';
import type { ResumeRagService } from '../resume-rag/resume-rag.service';
import { MainChatService } from './main-chat.service';

const response = {
  answer: '근거 기반 답변',
  grounded: true,
  sources: [],
};

describe('MainChatService', () => {
  it.each([
    ['안녕!', 'ko-KR', '대표 프로젝트와 맡은 역할'],
    ['Thanks', 'en-US', 'You’re welcome!'],
    ['何を聞けますか？', 'ja-JP', 'プロジェクトでの役割'],
  ])(
    '간단한 문구 %s에 고정 응답을 반환한다',
    async (question, locale, answerText) => {
      const answer = jest.fn();
      const resumeRagService = { answer } as unknown as ResumeRagService;
      const service = new MainChatService(resumeRagService);

      const result = await service.answer({ question, locale });

      expect(result.answer).toContain(answerText);
      expect(result).toMatchObject({
        grounded: false,
        sources: [],
      });
      expect(answer).not.toHaveBeenCalled();
    },
  );

  it('인사와 프로젝트 질문이 함께 있으면 프로젝트 질문으로 처리한다', async () => {
    const answer = jest.fn().mockResolvedValue(response);
    const resumeRagService = { answer } as unknown as ResumeRagService;
    const service = new MainChatService(resumeRagService);
    const request = {
      question: '안녕하세요, 대표 프로젝트를 알려주세요',
      locale: 'ko-KR',
    };

    await expect(service.answer(request)).resolves.toEqual(response);
    expect(answer).toHaveBeenCalledWith(request, { recordQuestion: false });
  });

  it.each([
    ['프로젝트', 'Oprimed 프로젝트에서 어떤 역할을 맡았나요?'],
    ['이력서', '프론트엔드 경력과 강점을 알려주세요.'],
  ])('%s 질문을 기존 공개 근거 답변 흐름에 전달한다', async (_, question) => {
    const answer = jest.fn().mockResolvedValue(response);
    const resumeRagService = { answer } as unknown as ResumeRagService;
    const service = new MainChatService(resumeRagService);

    await expect(
      service.answer({ question, locale: 'ko-KR' }),
    ).resolves.toEqual(response);
    expect(answer).toHaveBeenCalledWith(
      { question, locale: 'ko-KR' },
      { recordQuestion: false },
    );
  });

  it('기존 근거 답변 공급자 실패를 503으로 유지한다', async () => {
    const answer = jest
      .fn()
      .mockRejectedValue(new ServiceUnavailableException('provider failed'));
    const resumeRagService = { answer } as unknown as ResumeRagService;
    const service = new MainChatService(resumeRagService);

    await expect(
      service.answer({ question: '프로젝트 질문', locale: 'ko-KR' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
