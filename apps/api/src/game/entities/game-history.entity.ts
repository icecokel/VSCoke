import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { GameType } from '../enums/game-type.enum';

@Entity()
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  score: number;

  @Column({
    type: 'enum',
    enum: GameType,
    default: GameType.SKY_DROP,
  })
  gameType: GameType;

  @Column({ type: 'int', nullable: true })
  playTime?: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ name: 'userId' })
  userId: string;

  @ManyToOne(() => User)
  user: User;
}
