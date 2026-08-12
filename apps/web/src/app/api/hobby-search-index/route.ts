import { getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { buildHobbySearchItems } from "@/features/hobby/lib/search-index";
import { routing } from "@/i18n/routing";
import { getEspressoBeans } from "@/services/espresso-history-service";
import { getRecipes } from "@/services/recipe-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale =
    routing.locales.find(candidate => candidate === requestedLocale) ?? routing.defaultLocale;
  const [recipes, espressoBeans, tRecipes, tEspresso] = await Promise.all([
    getRecipes(),
    getEspressoBeans(),
    getTranslations({ locale, namespace: "hobby.recipes" }),
    getTranslations({ locale, namespace: "hobby.espresso" }),
  ]);

  return NextResponse.json({
    data: buildHobbySearchItems(recipes, espressoBeans, {
      recipeSummary: (ingredients, steps) => tRecipes("summary", { ingredients, steps }),
      espressoSummary: (roaster, rounds) =>
        tEspresso("searchSummary", {
          roaster: roaster ?? tEspresso("searchBeanFallback"),
          rounds,
        }),
    }),
  });
}
