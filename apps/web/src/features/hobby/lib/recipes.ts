import type { Recipe } from "@/features/hobby/types/recipe";

const normalizeSearchText = (value: string) => value.toLowerCase().normalize("NFKC");

export const getRecipeSearchText = (recipe: Recipe): string => {
  return normalizeSearchText(
    [
      recipe.name,
      ...recipe.tags,
      ...recipe.ingredients,
      ...recipe.recipe,
      recipe.source?.type ?? "",
      recipe.source?.url ?? "",
    ].join(" "),
  );
};

export const filterRecipes = (recipes: Recipe[], query: string): Recipe[] => {
  const normalizedQuery = normalizeSearchText(query.trim());

  if (!normalizedQuery) {
    return recipes;
  }

  return recipes.filter(recipe => getRecipeSearchText(recipe).includes(normalizedQuery));
};
