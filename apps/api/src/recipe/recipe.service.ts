import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';
import type { RecipeRecord } from './recipe.types';

@Injectable()
export class RecipeService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
  ) {}

  async getRecipes(): Promise<RecipeRecord[]> {
    const recipes = await this.recipeRepository.find({
      order: { createdAt: 'ASC', name: 'ASC' },
    });

    return recipes.map((recipe) => this.toRecipeRecord(recipe));
  }

  async getRecipeById(id: string): Promise<RecipeRecord> {
    const recipe = await this.recipeRepository.findOne({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return this.toRecipeRecord(recipe);
  }

  private toRecipeRecord(recipe: Recipe): RecipeRecord {
    return {
      id: recipe.id,
      name: recipe.name,
      tags: recipe.tags,
      ingredients: recipe.ingredients,
      recipe: recipe.steps,
      source: recipe.source ?? undefined,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    };
  }
}
