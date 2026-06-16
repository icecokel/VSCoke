import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EspressoBean } from './espresso-bean.entity';
import { EspressoRound } from './espresso-round.entity';
import type {
  EspressoAdjustmentGuide,
  EspressoCurrentAnalysis,
  EspressoNextTest,
} from '../espresso-history.types';

@Entity('espresso_history')
export class EspressoHistory {
  @PrimaryColumn()
  id: string;

  @Column()
  beanId: string;

  @ManyToOne(() => EspressoBean, (bean) => bean.histories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'beanId' })
  bean: EspressoBean;

  @Column()
  title: string;

  @Column({ type: 'jsonb', nullable: true })
  currentAnalysis: EspressoCurrentAnalysis | null;

  @Column({ type: 'jsonb', nullable: true })
  adjustmentGuide: EspressoAdjustmentGuide[] | null;

  @Column({ type: 'jsonb', nullable: true })
  finalHypothesis: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  nextTest: EspressoNextTest | null;

  @Column({ type: 'jsonb', nullable: true })
  nextDirection: string[] | null;

  @OneToMany(() => EspressoRound, (round) => round.history)
  rounds: EspressoRound[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
