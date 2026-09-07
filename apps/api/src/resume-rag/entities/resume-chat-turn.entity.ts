import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResumeChatConversation } from './resume-chat-conversation.entity';
import type { ResumeRagSourceDto } from '../dto/resume-rag-source.dto';

@Entity('resume_chat_turns')
@Index(['conversationId', 'requestId'], { unique: true })
@Index(['conversationId', 'createdAt'])
export class ResumeChatTurn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ResumeChatConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ResumeChatConversation;

  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'boolean' })
  grounded: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  sources: ResumeRagSourceDto[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
