import { Column, DeleteDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('resume_details')
export class ResumeDetail {
  @PrimaryColumn({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'start_date', type: 'text', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'text', nullable: true })
  endDate: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'integer', default: 1 })
  revision: number;

  @Column({ type: 'text', default: 'private' })
  visibility: 'private' | 'public';

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
