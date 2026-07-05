import {
  Column,
  type ColumnType,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('resume_vector_chunks')
@Index(
  [
    'sourceItemId',
    'chunkIndex',
    'embeddingProvider',
    'embeddingModel',
    'embeddingDimensions',
    'chunkerVersion',
    'chunkConfigHash',
  ],
  { unique: true },
)
@Index(['locale'])
@Index(['status', 'visibility'])
@Index(['embeddingProvider', 'embeddingModel', 'embeddingDimensions'])
export class ResumeVectorChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sourceItemId: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 96 })
  contentHash: string;

  @Column({ type: 'varchar', length: 60 })
  sourceType: string;

  @Column({ type: 'varchar', length: 60 })
  itemType: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  locale: string | null;

  @Column({ type: 'varchar', length: 500 })
  sourcePath: string;

  @Column({ type: 'varchar', length: 300 })
  sourceKey: string;

  @Column({ type: 'varchar', length: 40 })
  visibility: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  citationMetadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 80 })
  embeddingProvider: string;

  @Column({ type: 'varchar', length: 160 })
  embeddingModel: string;

  @Column({ type: 'int' })
  embeddingDimensions: number;

  @Column({ type: 'vector' as ColumnType })
  embedding: number[];

  @Column({ type: 'varchar', length: 80 })
  chunkerVersion: string;

  @Column({ type: 'varchar', length: 96 })
  chunkConfigHash: string;

  @Column({ type: 'timestamptz' })
  indexedAt: Date;
}
