import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResumeDetail } from './entities/resume-detail.entity';
import { ResumeDocument } from './entities/resume-document.entity';
import { resumeDocumentSnapshot } from '../migrations/data/resume-content-snapshot';
import { ResumeService } from './resume.service';

describe('ResumeService', () => {
  let service: ResumeService;
  const documents = { findOneBy: jest.fn() };
  const details = { find: jest.fn(), findOneBy: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: getRepositoryToken(ResumeDocument), useValue: documents },
        { provide: getRepositoryToken(ResumeDetail), useValue: details },
      ],
    }).compile();
    service = module.get(ResumeService);
  });

  it('언어 기본키와 DB 본문을 반환하고 매번 DB에서 다시 조회한다', async () => {
    const { locale, ...content } = resumeDocumentSnapshot[0];
    documents.findOneBy.mockResolvedValue({ locale, content });
    expect(await service.getDocument(locale)).toEqual({ locale, ...content });
    documents.findOneBy.mockResolvedValue({
      locale,
      content: { ...content, title: 'DB에서 수정한 제목' },
    });
    expect((await service.getDocument(locale)).title).toBe(
      'DB에서 수정한 제목',
    );
    expect(documents.findOneBy).toHaveBeenCalledTimes(2);
    expect(documents.findOneBy).toHaveBeenLastCalledWith({ locale });
  });

  it('목록에서 본문을 조회하지 않고 선택적 날짜를 생략한다', async () => {
    details.find.mockResolvedValue([
      { slug: 'a-project', title: '제목', startDate: null, endDate: null },
    ]);
    expect(await service.getDetails()).toEqual([
      { slug: 'a-project', title: '제목' },
    ]);
    expect(details.find).toHaveBeenCalledWith({
      select: { slug: true, title: true, startDate: true, endDate: true },
      order: { slug: 'ASC' },
    });
  });

  it('상세 slug를 바인딩하고 MDX와 날짜를 그대로 반환한다', async () => {
    const detail = {
      slug: 'a-project',
      title: '제목',
      content: '# 신뢰된 MDX',
      startDate: '2026.02',
      endDate: '재직 중',
    };
    details.findOneBy.mockResolvedValue(detail);
    expect(await service.getDetail(detail.slug)).toEqual(detail);
    expect(details.findOneBy).toHaveBeenCalledWith({ slug: detail.slug });
  });

  it('없는 문서와 상세는 404로 처리한다', async () => {
    documents.findOneBy.mockResolvedValue(null);
    details.findOneBy.mockResolvedValue(null);
    await expect(service.getDocument('ko-KR')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.getDetail('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('DB 실패를 본문 fallback으로 감추지 않는다', async () => {
    const error = new Error('database unavailable');
    documents.findOneBy.mockRejectedValue(error);
    details.find.mockRejectedValue(error);
    details.findOneBy.mockRejectedValue(error);
    await expect(service.getDocument('ko-KR')).rejects.toBe(error);
    await expect(service.getDetails()).rejects.toBe(error);
    await expect(service.getDetail('a-project')).rejects.toBe(error);
  });
});
