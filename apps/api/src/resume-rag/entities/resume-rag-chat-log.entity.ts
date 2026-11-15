import {
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ChatChannel } from '../chat-definition';

export const RESUME_RAG_CHAT_OUTCOMES = [
  'simple-reply',
  'no-evidence',
  'answered',
  'rejected',
  'failed',
] as const;

export type ResumeRagChatOutcome = (typeof RESUME_RAG_CHAT_OUTCOMES)[number];

// 단일 턴 이력 질문만 마스킹한 질문 원문을 남긴다. 저장 대화와 메인 채팅은
// 질문 원문 없이 결과 지표만 남겨 대화 삭제·보존 정책과 충돌하지 않게 한다.
@Entity('resume_rag_chat_logs')
@Index(['createdAt'])
@Index(['locale', 'createdAt'])
@Index(['channel', 'outcome', 'createdAt'])
export class ResumeRagChatLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  questionText: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  questionHash: string | null;

  @Column({ type: 'varchar', length: 16 })
  locale: string;

  @Column({ type: 'varchar', length: 12 })
  channel: ChatChannel;

  // migration 이전 기록은 결과를 알 수 없어 NULL이다.
  @Column({ type: 'varchar', length: 16, nullable: true })
  outcome: ResumeRagChatOutcome | null;

  @Column({ type: 'int', nullable: true })
  sourceCount: number | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  failureStage: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;
}
