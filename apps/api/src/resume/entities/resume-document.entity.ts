import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ResumeDocumentDto, ResumeLocale } from '../resume.dto';

@Entity('resume_documents')
export class ResumeDocument {
  @PrimaryColumn({ type: 'varchar', length: 5 })
  locale: ResumeLocale;

  @Column({ type: 'jsonb' })
  content: Omit<ResumeDocumentDto, 'locale'>;
}
