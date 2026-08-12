import { getEspressoSearchText } from "@/features/hobby/lib/espresso";
import { getRecipeSearchText } from "@/features/hobby/lib/recipes";
import type { EspressoBean } from "@/features/hobby/types/espresso";
import type { Recipe } from "@/features/hobby/types/recipe";
import type { SearchItem } from "@/types/search";

type HobbySearchCopy = {
  espressoSummary: (roaster: string | undefined, rounds: number) => string;
  recipeSummary: (ingredients: number, steps: number) => string;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const uniqueStrings = (values: string[]): string[] => {
  const set = new Set(values.filter(isNonEmptyString).map(value => value.trim()));
  return [...set];
};

export const buildHobbySearchItems = (
  recipes: Recipe[],
  espressoBeans: EspressoBean[],
  copy: HobbySearchCopy,
): SearchItem[] => {
  const hobbyRecipeItems: SearchItem[] = recipes.map(recipe => ({
    id: `hobby:recipe:${recipe.name}`,
    type: "hobby",
    title: recipe.name,
    description: copy.recipeSummary(recipe.ingredients.length, recipe.recipe.length),
    keywords: uniqueStrings([recipe.name, ...recipe.tags, getRecipeSearchText(recipe)]),
    path: "/hobby/recipes",
    priority: 210,
  }));

  const hobbyEspressoItems: SearchItem[] = espressoBeans.map(bean => ({
    id: `hobby:espresso:${bean.id}`,
    type: "hobby",
    title: bean.name,
    description: copy.espressoSummary(bean.roaster, bean.logs.flatMap(log => log.rounds).length),
    keywords: uniqueStrings([
      bean.name,
      bean.roaster ?? "",
      ...bean.goals,
      getEspressoSearchText(bean),
    ]),
    path: `/hobby/espresso/${bean.id}`,
    priority: 208,
  }));

  return [...hobbyRecipeItems, ...hobbyEspressoItems];
};
