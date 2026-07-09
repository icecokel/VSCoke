import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResumeRagKeywordTerm } from './resume-rag-keyword-term.entity';

@Entity('resume_rag_keyword_groups')
export class ResumeRagKeywordGroupEntity {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'int' })
  weight: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => ResumeRagKeywordTerm, (term) => term.group)
  terms: ResumeRagKeywordTerm[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
