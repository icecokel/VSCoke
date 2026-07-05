import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResumeImportBatch } from './resume-import-batch.entity';

@Entity('resume_source_items')
@Index(['sourceType', 'sourceKey', 'contentHash'], { unique: true })
@Index(['sourceType', 'itemType'])
@Index(['status', 'visibility', 'vectorize'])
@Index(['contentHash'])
export class ResumeSourceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  importBatchId: string | null;

  @ManyToOne(() => ResumeImportBatch, (batch) => batch.sourceItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'importBatchId' })
  importBatch: ResumeImportBatch | null;

  @Column({ type: 'varchar', length: 60 })
  sourceType: string;

  @Column({ type: 'varchar', length: 60 })
  itemType: string;

  @Column({ type: 'varchar', length: 500 })
  sourcePath: string;

  @Column({ type: 'varchar', length: 300 })
  sourceKey: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text' })
  bodyText: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  locale: string | null;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 40 })
  visibility: string;

  @Column({ type: 'boolean' })
  vectorize: boolean;

  @Column({ type: 'varchar', length: 96 })
  contentHash: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
