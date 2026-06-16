import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { RecipeSource } from '../recipe.types';

@Entity('recipe')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  tags: string[];

  @Column({ type: 'jsonb' })
  ingredients: string[];

  @Column({ type: 'jsonb' })
  steps: string[];

  @Column({ type: 'jsonb', nullable: true })
  source: RecipeSource | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
