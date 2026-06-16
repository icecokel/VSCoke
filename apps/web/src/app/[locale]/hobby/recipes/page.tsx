import { RecipeBrowser } from "@/features/hobby/components/recipe-browser";
import { getRecipes } from "@/services/recipe-service";

export const dynamic = "force-dynamic";

export default async function HobbyRecipesPage() {
  const recipes = await getRecipes();

  return <RecipeBrowser recipes={recipes} />;
}
