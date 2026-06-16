import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EspressoHistory } from './espresso-history.entity';
import type { EspressoEquipment } from '../espresso-history.types';

@Entity('espresso_bean')
export class EspressoBean {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  roaster: string | null;

  @Column({ type: 'jsonb' })
  goals: string[];

  @Column({ type: 'jsonb' })
  defaultEquipment: EspressoEquipment;

  @OneToMany(() => EspressoHistory, (history) => history.bean)
  histories: EspressoHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
