import { NextResponse } from "next/server";
import { buildHobbySearchItems } from "@/features/hobby/lib/search-index";
import { getEspressoBeans } from "@/services/espresso-history-service";
import { getRecipes } from "@/services/recipe-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const [recipes, espressoBeans] = await Promise.all([getRecipes(), getEspressoBeans()]);

  return NextResponse.json({
    data: buildHobbySearchItems(recipes, espressoBeans),
  });
}
