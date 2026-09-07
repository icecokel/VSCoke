import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ResumeImportBatch } from '../entities/resume-import-batch.entity';
import { ResumeSourceItem } from '../entities/resume-source-item.entity';
import {
  type ResumeImportManifestEntry,
  loadResumeSourceItemsFromEntry,
} from './resume-source-item-loader';

type ResumeImportOptions = {
  retireMissingSourceTypes?: readonly string[];
};

type ResumeSourceIdentity = Pick<
  ResumeSourceItem,
  'id' | 'sourceType' | 'sourceKey' | 'status'
>;

export const findRetiredResumeSourceItemIds = (
  items: readonly ResumeSourceIdentity[],
  entries: readonly Pick<ResumeImportManifestEntry, 'id' | 'sourceType'>[],
  managedSourceTypes: readonly string[],
): string[] => {
  const currentEntryIdsBySourceType = new Map<string, string[]>();
  for (const sourceType of managedSourceTypes) {
    const entryIds = entries
      .filter((entry) => entry.sourceType === sourceType)
      .map((entry) => entry.id);
    if (entryIds.length > 0)
      currentEntryIdsBySourceType.set(sourceType, entryIds);
  }

  return items
    .filter((item) => item.status !== 'superseded')
    .filter((item) => {
      const entryIds = currentEntryIdsBySourceType.get(item.sourceType);
      if (!entryIds) return false;
      return !entryIds.some(
        (entryId) =>
          item.sourceKey === entryId ||
          item.sourceKey.startsWith(`${entryId}#`),
      );
    })
    .map((item) => item.id);
};

type ImportSummary = {
  entries: number;
  imported: number;
  rejected: number;
  failed: number;
  vectorizable: number;
  storeOnly: number;
  retired: number;
  failures: Array<{ id: string; message: string }>;
};

@Injectable()
export class ResumeSourceItemImportService {
  constructor(
    @InjectRepository(ResumeImportBatch)
    private readonly batchRepository: Repository<ResumeImportBatch>,
    @InjectRepository(ResumeSourceItem)
    private readonly sourceItemRepository: Repository<ResumeSourceItem>,
  ) {}

  async importEntries(
    entries: ResumeImportManifestEntry[],
    sourceRoot: string,
    options: ResumeImportOptions = {},
  ): Promise<ResumeImportBatch> {
    const batch = await this.batchRepository.save(
      this.batchRepository.create({
        sourceName: 'resume-rag',
        sourceRoot,
        importerVersion: 'resume-rag-v1',
        status: 'running',
        startedAt: new Date(),
        finishedAt: null,
        summary: {},
      }),
    );

    const summary: ImportSummary = {
      entries: entries.length,
      imported: 0,
      rejected: 0,
      failed: 0,
      vectorizable: 0,
      storeOnly: 0,
      retired: 0,
      failures: [],
    };

    for (const entry of entries) {
      try {
        const items = loadResumeSourceItemsFromEntry(entry);
        await this.sourceItemRepository.manager.transaction(async (manager) => {
          const repository = manager.getRepository(ResumeSourceItem);
          const retainedIds: string[] = [];
          for (const item of items) {
            const existing = await repository.findOne({
              where: {
                sourceType: item.sourceType,
                sourceKey: item.sourceKey,
                contentHash: item.contentHash,
              },
            });
            const saved = await repository.save(
              repository.create({
                ...existing,
                ...item,
                importBatchId: batch.id,
              }),
            );
            retainedIds.push(saved.id);
          }
          const first = items[0];
          if (first && retainedIds.length > 0) {
            await repository
              .createQueryBuilder()
              .update(ResumeSourceItem)
              .set({ status: 'superseded', vectorize: false })
              .where(
                '"sourceType" = :sourceType AND ("sourceKey" = :entryId OR left("sourceKey", length(:sectionPrefix)) = :sectionPrefix)',
                {
                  sourceType: first.sourceType,
                  entryId: entry.id,
                  sectionPrefix: `${entry.id}#`,
                },
              )
              .andWhere('"id" NOT IN (:...retainedIds)', { retainedIds })
              .execute();
          }
        });
        for (const item of items) {
          if (item.status === 'rejected') summary.rejected += 1;
          if (item.vectorize) summary.vectorizable += 1;
          else summary.storeOnly += 1;
          summary.imported += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.failures.push({
          id: entry.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (summary.failed === 0 && options.retireMissingSourceTypes?.length) {
      const managedSourceTypes = [...new Set(options.retireMissingSourceTypes)];
      const existingItems = await this.sourceItemRepository.find({
        where: {
          sourceType: In(managedSourceTypes),
          status: Not('superseded'),
        },
        select: ['id', 'sourceType', 'sourceKey', 'status'],
      });
      const retiredIds = findRetiredResumeSourceItemIds(
        existingItems,
        entries,
        managedSourceTypes,
      );
      if (retiredIds.length > 0) {
        const result = await this.sourceItemRepository.update(
          { id: In(retiredIds) },
          { status: 'superseded', vectorize: false },
        );
        summary.retired = result.affected ?? retiredIds.length;
      }
    }

    await this.batchRepository.update(batch.id, {
      status: summary.failed > 0 ? 'completed_with_errors' : 'completed',
      finishedAt: new Date(),
      summary,
    });

    return {
      ...batch,
      status: summary.failed > 0 ? 'completed_with_errors' : 'completed',
      finishedAt: new Date(),
      summary,
    };
  }
}
