import type { EntityManager, Repository } from 'typeorm';
import { ResumeImportBatch } from '../entities/resume-import-batch.entity';
import { ResumeSourceItem } from '../entities/resume-source-item.entity';
import {
  loadResumeSourceItemsFromEntry,
  type ResumeImportManifestEntry,
} from './resume-source-item-loader';
import { ResumeSourceItemImportService } from './resume-source-item-import.service';

jest.mock('./resume-source-item-loader', () => ({
  loadResumeSourceItemsFromEntry: jest.fn(),
}));

import { findRetiredResumeSourceItemIds } from './resume-source-item-import.service';

const item = (
  id: string,
  sourceType: string,
  sourceKey: string,
  status = 'active',
) => ({ id, sourceType, sourceKey, status });

const entry = (id: string, sourceType: string) => ({ id, sourceType });

describe('findRetiredResumeSourceItemIds', () => {
  it('manifest에서 사라진 관리 원본과 그 섹션만 retire 대상으로 고른다', () => {
    expect(
      findRetiredResumeSourceItemIds(
        [
          item('keep-root', 'app_resume', 'app:resume-data'),
          item('keep-section', 'app_resume', 'app:resume-data#experience'),
          item('remove-root', 'app_resume', 'app:removed'),
          item('remove-section', 'app_resume', 'app:removed#detail'),
          item('workspace', 'resume_workspace', 'workspace:private'),
          item('already-old', 'app_resume', 'app:old', 'superseded'),
        ],
        [entry('app:resume-data', 'app_resume')],
        ['app_resume'],
      ),
    ).toEqual(['remove-root', 'remove-section']);
  });

  it('해당 sourceType의 현재 manifest가 비어 있으면 전체 retire를 하지 않는다', () => {
    expect(
      findRetiredResumeSourceItemIds(
        [item('existing', 'app_resume', 'app:resume-data')],
        [],
        ['app_resume'],
      ),
    ).toEqual([]);
  });

  it('관리 대상으로 지정하지 않은 sourceType은 변경하지 않는다', () => {
    expect(
      findRetiredResumeSourceItemIds(
        [item('workspace', 'resume_workspace', 'workspace:old')],
        [entry('app:resume-data', 'app_resume')],
        ['app_resume'],
      ),
    ).toEqual([]);
  });
});

describe('ResumeSourceItemImportService', () => {
  it.each(['latest', 'same-hash'])(
    '삭제된 %s source를 재import로 복원하거나 superseded 처리하지 않는다',
    async (deletedMatch) => {
      const tombstone = {
        id: 'deleted-source',
        deletedAt: new Date(),
        status: 'active',
      };
      const source = {
        sourceType: 'app_resume',
        sourceKey: 'synthetic',
        contentHash: 'synthetic-hash',
        status: 'active',
        vectorize: true,
      };
      jest
        .mocked(loadResumeSourceItemsFromEntry)
        .mockReturnValue([
          source as ReturnType<typeof loadResumeSourceItemsFromEntry>[number],
        ]);
      const sources = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(deletedMatch === 'latest' ? tombstone : null)
          .mockResolvedValue(tombstone),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      };
      const manager = {
        query: jest.fn().mockResolvedValue([]),
        getRepository: () => sources,
      };
      const batches = {
        create: jest.fn((values: Partial<ResumeImportBatch>) => values),
        save: jest.fn().mockResolvedValue({ id: 'batch' }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const service = new ResumeSourceItemImportService(
        batches as unknown as Repository<ResumeImportBatch>,
        {
          ...sources,
          manager: {
            transaction: (
              operation: (manager: EntityManager) => Promise<unknown>,
            ) => operation(manager as unknown as EntityManager),
          },
        } as unknown as Repository<ResumeSourceItem>,
      );
      const batch = await service.importEntries(
        [
          {
            id: 'synthetic',
            sourceType: 'app_resume',
          } as ResumeImportManifestEntry,
        ],
        'synthetic-root',
      );
      expect(batch.summary).toMatchObject({ failed: 1, imported: 0 });
      expect(sources.save).not.toHaveBeenCalled();
      expect(sources.createQueryBuilder).not.toHaveBeenCalled();
      expect(sources.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
    },
  );
});
