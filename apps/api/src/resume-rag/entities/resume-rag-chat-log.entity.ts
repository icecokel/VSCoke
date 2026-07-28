import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('resume_rag_chat_logs')
@Index(['createdAt'])
@Index(['locale', 'createdAt'])
export class ResumeRagChatLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'varchar', length: 64 })
  questionHash: string;

  @Column({ type: 'varchar', length: 16 })
  locale: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
