import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { UsageEventName, UsageFeature } from './usage.dto';

@Entity('usage_events')
@Index('IDX_usage_events_created_at', ['createdAt'])
@Index('IDX_usage_events_event_time', ['eventName', 'createdAt'])
export class UsageEvent {
  @PrimaryColumn('uuid')
  eventId: string;

  @Column('uuid')
  visitorId: string;

  @Column('uuid')
  sessionId: string;

  @Column({ type: 'varchar', length: 32 })
  eventName: UsageEventName;

  @Column({ type: 'varchar', length: 200 })
  path: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  feature: UsageFeature | null;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
