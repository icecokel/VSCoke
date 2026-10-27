import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResumeService } from './resume.service';

const content = {
  name: 'Synthetic',
  title: 'PE',
  contact: { email: 'a@example.test', phone: '' },
  introduction: [],
  totalExperience: '',
  lastUpdated: '2026.10',
  careers: [],
  education: [],
  skills: [],
  certifications: [],
  links: [],
  personalProjects: [],
};
describe('ResumeService 공통 registry 조회', () => {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]?]>();
  const transaction = jest.fn<
    Promise<unknown>,
    [string, (manager: unknown) => Promise<unknown>]
  >();
  const service = new ResumeService({
    manager: { query },
    query,
    transaction,
  } as unknown as DataSource);
  beforeEach(() => jest.resetAllMocks());
  it('선택 key와 locale만 조회하고 공개 메타정보만 반환한다', async () => {
    query.mockResolvedValue([
      {
        id: 'doc',
        key: 'fe',
        locale: 'en-US',
        version_id: 'version',
        version_name: 'v29',
        content_hash: 'hash',
        content,
        source_ref: { secret: true },
      },
    ]);
    expect(await service.getDocument('en-US', 'fe')).toEqual({
      ...content,
      documentId: 'doc',
      key: 'fe',
      locale: 'en-US',
      versionId: 'version',
      versionName: 'v29',
      contentHash: 'hash',
    });
    expect(query.mock.calls[0][1]).toEqual(['fe', 'en-US']);
    expect(query.mock.calls[0][0]).toContain("r.visibility='public'");
  });
  it('없는 현재 공개 문서에는 legacy fallback 없이 404', async () => {
    query.mockResolvedValue([]);
    await expect(service.getDocument('ko-KR')).rejects.toThrow(
      NotFoundException,
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('preview는 한 repeatable-read manager로 중복 제거한 상세를 순서대로 읽는다', async () => {
    const document = {
      ...content,
      careers: [
        { projects: [{ fileRef: 'b' }, { fileRef: 'a' }, { fileRef: 'b' }] },
      ],
    };
    query
      .mockResolvedValueOnce([
        {
          id: 'doc',
          key: 'pe',
          locale: 'ko-KR',
          version_id: 'v',
          version_name: 'v1',
          content_hash: 'h',
          content: document,
        },
      ])
      .mockResolvedValueOnce([
        {
          slug: 'b',
          title: 'B',
          content: 'B',
          start_date: null,
          end_date: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          slug: 'a',
          title: 'A',
          content: 'A',
          start_date: null,
          end_date: null,
        },
      ]);
    transaction.mockImplementation(
      (_isolation: string, work: (manager: unknown) => Promise<unknown>) =>
        work({ query }),
    );
    const result = await service.getPreview('ko-KR');
    expect(transaction.mock.calls[0][0]).toBe('REPEATABLE READ');
    expect(result.details.map((detail) => detail.slug)).toEqual(['b', 'a']);
    expect(result.details[0]).not.toHaveProperty('startDate');
  });
  it('문서는 있지만 연결 상세가 없으면 재시도 가능한 503', async () => {
    query
      .mockResolvedValueOnce([
        {
          id: 'doc',
          key: 'pe',
          locale: 'ko-KR',
          version_id: 'v',
          version_name: 'v1',
          content_hash: 'h',
          content: {
            ...content,
            careers: [{ projects: [{ fileRef: 'missing' }] }],
          },
        },
      ])
      .mockResolvedValueOnce([]);
    transaction.mockImplementation((_isolation, work) => work({ query }));
    await expect(service.getPreview('ko-KR')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
  it('누락 상세와 DB 실패는 그대로 전파한다', async () => {
    query.mockResolvedValue([]);
    await expect(service.getDetail('missing')).rejects.toThrow(
      NotFoundException,
    );
    const error = new Error('DB failed');
    query.mockRejectedValue(error);
    await expect(service.getDocument('ko-KR')).rejects.toBe(error);
  });
});
