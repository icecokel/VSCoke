import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { GeekNewsTranslationStatus } from '../geeknews.types';

@Entity()
@Index(['sourceTopicId'], { unique: true })
export class GeekNewsArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  sourceTopicId: number;

  @Column()
  topicUrl: string;

  @Column({ type: 'varchar', nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  author: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int' })
  rank: number;

  @Column()
  listedAtText: string;

  @Column({ type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @Column({ default: 'ko' })
  sourceLanguage: string;

  @Column({ type: 'varchar', nullable: true })
  translatedLanguage: string | null;

  @Column({ type: 'text', nullable: true })
  translatedTitle: string | null;

  @Column({ type: 'text', nullable: true })
  translatedContent: string | null;

  @Column({ default: 'pending' })
  translationStatus: GeekNewsTranslationStatus;

  @Column({ type: 'varchar', nullable: true })
  translationProvider: string | null;

  @Column({ type: 'varchar', nullable: true })
  translationModel: string | null;

  @Column({ type: 'text', nullable: true })
  translationError: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  translatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
