import {
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { ChatChannel } from '../chat-definition';

export type ResumeChatChannel = ChatChannel;

@Entity('resume_chat_conversations')
@Index(['expiresAt'])
export class ResumeChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ type: 'varchar', length: 12 })
  channel: ResumeChatChannel;

  @Column({ type: 'varchar', length: 16 })
  locale: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  resumeKey: string | null;

  @Column({ type: 'int', default: 0 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;
}
