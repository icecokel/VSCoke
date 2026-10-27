import { Column, DeleteDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { ResumeContentDto, ResumeLocale } from '../resume.dto';

@Entity('resume_documents')
export class ResumeDocument {
  @PrimaryColumn({ type: 'varchar', length: 5 })
  locale: ResumeLocale;

  @Column({ type: 'jsonb' })
  content: ResumeContentDto;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
