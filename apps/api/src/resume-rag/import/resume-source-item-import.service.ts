import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeImportBatch } from '../entities/resume-import-batch.entity';
import { ResumeSourceItem } from '../entities/resume-source-item.entity';
import {
  type ResumeImportManifestEntry,
  loadResumeSourceItemsFromEntry,
} from './resume-source-item-loader';

type ImportSummary = {
  entries: number;
  imported: number;
  rejected: number;
  failed: number;
  vectorizable: number;
  storeOnly: number;
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
      failures: [],
    };

    for (const entry of entries) {
      try {
        const items = loadResumeSourceItemsFromEntry(entry);
        for (const item of items) {
          if (item.status === 'rejected') {
            summary.rejected += 1;
          }
          if (item.vectorize) {
            summary.vectorizable += 1;
          } else {
            summary.storeOnly += 1;
          }

          const existing = await this.sourceItemRepository.findOne({
            where: {
              sourceType: item.sourceType,
              sourceKey: item.sourceKey,
              contentHash: item.contentHash,
            },
          });
          await this.sourceItemRepository.save(
            this.sourceItemRepository.create({
              ...existing,
              ...item,
              importBatchId: batch.id,
            }),
          );
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
