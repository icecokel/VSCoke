import { ApiError, apiClient } from "@/lib/api-client";
import type { Recipe } from "@/features/hobby/types/recipe";

const recipeRequestOptions = {
  next: { revalidate: 60 },
} as const;

export const getRecipes = async (): Promise<Recipe[]> => {
  return apiClient.get<Recipe[]>("/recipes", recipeRequestOptions);
};

export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  try {
    return await apiClient.get<Recipe>(`/recipes/${encodeURIComponent(id)}`, recipeRequestOptions);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};
