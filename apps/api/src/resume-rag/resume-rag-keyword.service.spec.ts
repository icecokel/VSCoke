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

    await expect(service.calculateKeywordScore('특수키워드')).resolves.toBe(2);
    await expect(service.isQuestionInScope('특수키워드')).resolves.toBe(true);
    await expect(service.createSearchTokens('특수키워드')).resolves.toEqual(
      expect.arrayContaining(['특수키워드', '배포', '검증']),
    );
    await expect(service.isQuestionInScope('cicd경험')).resolves.toBe(true);
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

    await expect(service.isQuestionInScope('cicd경험')).resolves.toBe(true);
    await expect(service.createSearchTokens('cicd경험')).resolves.toEqual(
      expect.arrayContaining(['github', 'actions', '배포', '검증']),
    );
  });

  it('uses built-in keyword groups when the database has no enabled keyword rows', async () => {
    const service = new ResumeRagKeywordService({
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource);

    await expect(service.isQuestionInScope('웹뷰경험')).resolves.toBe(true);
    await expect(service.createSearchTokens('웹뷰경험')).resolves.toEqual(
      expect.arrayContaining(['모바일', '웹뷰', '콘텐츠']),
    );
  });
});
