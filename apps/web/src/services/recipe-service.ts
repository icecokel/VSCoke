import { apiClient } from "@/lib/api-client";
import type { Recipe } from "@/features/hobby/types/recipe";
import { isRecoverableReadError, logRecoverableReadError } from "@/services/api-read-error";

const recipeRequestOptions = {
  next: { revalidate: 60 },
} as const;

export const getRecipes = async (): Promise<Recipe[]> => {
  try {
    return await apiClient.get<Recipe[]>("/recipes", recipeRequestOptions);
  } catch (error) {
    if (isRecoverableReadError(error)) {
      logRecoverableReadError("recipe", error);
      return [];
    }

    throw error;
  }
};
