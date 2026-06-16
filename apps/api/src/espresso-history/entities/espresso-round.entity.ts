import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EspressoHistory } from './espresso-history.entity';
import type {
  EspressoRecipeParameters,
  EspressoResult,
  EspressoRoundAnalysis,
} from '../espresso-history.types';

@Entity('espresso_round')
export class EspressoRound {
  @PrimaryColumn()
  id: string;

  @Column()
  historyId: string;

  @ManyToOne(() => EspressoHistory, (history) => history.rounds, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'historyId' })
  history: EspressoHistory;

  @Column({ type: 'int' })
  roundNumber: number;

  @Column({ type: 'date', nullable: true })
  date: string | null;

  @Column({ type: 'jsonb' })
  recipe: EspressoRecipeParameters;

  @Column({ type: 'jsonb' })
  result: EspressoResult;

  @Column({ type: 'jsonb', nullable: true })
  analysis: EspressoRoundAnalysis | null;

  @Column({ type: 'jsonb' })
  nextActions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
