export type RecipeSource = {
  type: string;
  url: string;
};

export type RecipeRecord = {
  id: string;
  name: string;
  tags: string[];
  ingredients: string[];
  recipe: string[];
  source?: RecipeSource;
  createdAt: Date;
  updatedAt: Date;
};
