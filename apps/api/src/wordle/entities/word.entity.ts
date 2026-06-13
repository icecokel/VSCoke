import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 5, unique: true })
  word: string;

  @CreateDateColumn()
  createdAt: Date;
}
