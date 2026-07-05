import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResumeSourceItem } from './resume-source-item.entity';

@Entity('resume_import_batches')
export class ResumeImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  sourceName: string;

  @Column({ type: 'varchar', length: 500 })
  sourceRoot: string;

  @Column({ type: 'varchar', length: 80 })
  importerVersion: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  summary: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ResumeSourceItem, (sourceItem) => sourceItem.importBatch)
  sourceItems: ResumeSourceItem[];
}
