import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { ResumeImportBatch } from './resume-import-batch.entity';
import { ResumeSourceItem } from './resume-source-item.entity';
import { ResumeVectorChunk } from './resume-vector-chunk.entity';

type EntityClass = { new (...args: never[]): unknown };

const tableNameFor = (target: EntityClass) =>
  getMetadataArgsStorage().tables.find((table) => table.target === target)
    ?.name;

const columnNamesFor = (target: EntityClass) =>
  getMetadataArgsStorage()
    .columns.filter((column) => column.target === target)
    .map((column) => column.propertyName);

describe('Resume RAG schema entities', () => {
  it('uses DB-source oriented table names', () => {
    expect(tableNameFor(ResumeImportBatch)).toBe('resume_import_batches');
    expect(tableNameFor(ResumeSourceItem)).toBe('resume_source_items');
    expect(tableNameFor(ResumeVectorChunk)).toBe('resume_vector_chunks');
  });

  it('keeps source items flexible and vectorization-aware', () => {
    expect(columnNamesFor(ResumeSourceItem)).toEqual(
      expect.arrayContaining([
        'metadata',
        'visibility',
        'status',
        'vectorize',
        'bodyText',
        'contentHash',
      ]),
    );
  });

  it('stores citation and embedding profile fields directly on vector rows', () => {
    expect(columnNamesFor(ResumeVectorChunk)).toEqual(
      expect.arrayContaining([
        'sourceType',
        'sourceKey',
        'sourcePath',
        'citationMetadata',
        'embeddingProvider',
        'embeddingModel',
        'embeddingDimensions',
        'embedding',
      ]),
    );
  });
});
