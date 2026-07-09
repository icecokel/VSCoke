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
import { ResumeRagKeywordGroupEntity } from './resume-rag-keyword-group.entity';

export type ResumeRagKeywordTermType = 'alias' | 'search_expansion';

@Entity('resume_rag_keyword_terms')
@Index(['groupId', 'termType', 'enabled'])
export class ResumeRagKeywordTerm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  groupId: string;

  @ManyToOne(() => ResumeRagKeywordGroupEntity, (group) => group.terms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: ResumeRagKeywordGroupEntity;

  @Column({ type: 'varchar', length: 32 })
  termType: ResumeRagKeywordTermType;

  @Column({ type: 'varchar', length: 160 })
  term: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  locale: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 40, default: 'manual' })
  source: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
