import { DataSource } from 'typeorm';
import { ResumeRagKeywordService } from './resume-rag-keyword.service';

describe('ResumeRagKeywordService', () => {
  it('loads keyword aliases and search expansions from the database', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        groupId: 'custom-delivery',
        weight: 2,
        termType: 'alias',
        term: '특수키워드',
      },
      {
        groupId: 'custom-delivery',
        weight: 2,
        termType: 'search_expansion',
        term: '배포 검증',
      },
    ]);
    const service = new ResumeRagKeywordService({
      query,
    } as unknown as DataSource);

    await expect(service.createSearchTokens('특수키워드')).resolves.toEqual(
      expect.arrayContaining(['특수키워드', '배포', '검증']),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('resume_rag_keyword_terms'),
    );
  });

  it('falls back to built-in keyword groups when keyword tables are unavailable', async () => {
    const missingTableError = Object.assign(
      new Error('relation "resume_rag_keyword_terms" does not exist'),
      { code: '42P01' },
    );
    const service = new ResumeRagKeywordService({
      query: jest.fn().mockRejectedValue(missingTableError),
    } as unknown as DataSource);

    await expect(service.createSearchTokens('cicd경험')).resolves.toEqual(
      expect.arrayContaining(['github', 'actions', '배포', '검증']),
    );
  });

  it('uses built-in keyword groups when the database has no enabled keyword rows', async () => {
    const service = new ResumeRagKeywordService({
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource);

    await expect(service.createSearchTokens('웹뷰경험')).resolves.toEqual(
      expect.arrayContaining(['모바일', '웹뷰', '콘텐츠']),
    );
  });

  it.each([
    ['삭제', false, true],
    ['비활성', false, true],
    ['단어 삭제', true, false],
  ])(
    '%s 항목은 코드 기본 별칭으로 복원하지 않는다',
    async (_label, groupEnabled, termEnabled) => {
      const service = new ResumeRagKeywordService({
        query: jest.fn().mockResolvedValue([
          {
            groupId: 'delivery',
            weight: 2,
            termType: 'alias',
            term: 'cicd',
            groupEnabled,
            termEnabled,
          },
        ]),
      } as unknown as DataSource);
      const tokens = await service.createSearchTokens('cicd경험');
      expect(tokens).not.toContain('github');
      expect(tokens).not.toContain('actions');
    },
  );

  it('키워드 테이블 부재가 아닌 데이터베이스 오류는 숨기지 않는다', async () => {
    const databaseError = Object.assign(new Error('connection refused'), {
      code: '08006',
    });
    const service = new ResumeRagKeywordService({
      query: jest.fn().mockRejectedValue(databaseError),
    } as unknown as DataSource);

    await expect(service.createSearchTokens('프로젝트')).rejects.toBe(
      databaseError,
    );
  });
});
