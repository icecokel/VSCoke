"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterRecipes } from "@/features/hobby/lib/recipes";
import type { Recipe } from "@/features/hobby/types/recipe";
import { useTranslations } from "next-intl";

type RecipeBrowserProps = {
  recipes: Recipe[];
};

const sourceLabelMap: Record<string, string> = {
  notion: "Notion",
  youtube: "YouTube",
  web: "Web",
};

const RecipeTag = ({ children }: { children: string }) => {
  return (
    <span className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-medium text-gray-300">
      {children}
    </span>
  );
};

const RecipeListItem = ({
  recipe,
  labels,
  onSelect,
}: {
  recipe: Recipe;
  labels: {
    detailAria: (name: string) => string;
    summary: (recipe: Recipe) => string;
    viewDetail: string;
  };
  onSelect: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label={labels.detailAria(recipe.name)}
      onClick={onSelect}
      className="group flex min-h-32 w-full cursor-pointer flex-col justify-between rounded-lg border border-gray-700 bg-gray-900 p-4 text-left transition-colors hover:border-blue-300/70 hover:bg-gray-850 focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-300/30 focus-visible:outline-none"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-100">{recipe.name}</h2>
          {recipe.tags.map(tag => (
            <RecipeTag key={`${recipe.name}-${tag}`}>{tag}</RecipeTag>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-400">{labels.summary(recipe)}</p>
      </div>
      <span className="mt-4 text-sm font-medium text-blue-200 transition-colors group-hover:text-blue-100">
        {labels.viewDetail}
      </span>
    </button>
  );
};

const RecipeDetail = ({
  recipe,
  labels,
  onBack,
}: {
  recipe: Recipe;
  labels: {
    backToList: string;
    ingredients: string;
    source: (source: string) => string;
    steps: string;
    summary: (recipe: Recipe) => string;
  };
  onBack: () => void;
}) => {
  const sourceUrl = recipe.source?.url;
  const sourceLabel = recipe.source
    ? (sourceLabelMap[recipe.source.type] ?? recipe.source.type)
    : null;

  return (
    <article className="rounded-lg border border-gray-700 bg-gray-900 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          {labels.backToList}
        </Button>
        {sourceUrl && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              {labels.source(sourceLabel ?? sourceUrl)}
            </a>
          </Button>
        )}
      </div>

      <div className="border-b border-gray-800 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-50 md:text-3xl">{recipe.name}</h2>
          {recipe.tags.map(tag => (
            <RecipeTag key={`${recipe.name}-detail-${tag}`}>{tag}</RecipeTag>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-400">{labels.summary(recipe)}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section>
          <h3 className="text-sm font-semibold tracking-wide text-blue-200 uppercase">
            {labels.ingredients}
          </h3>
          <ul className="mt-3 space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li
                key={`${recipe.name}-ingredient-${index}`}
                className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm leading-6 text-gray-200"
              >
                {ingredient}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold tracking-wide text-blue-200 uppercase">
            {labels.steps}
          </h3>
          <ol className="mt-3 space-y-3">
            {recipe.recipe.map((step, index) => (
              <li
                key={`${recipe.name}-step-${index}`}
                className="flex gap-3 text-sm leading-6 text-gray-200"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-300 text-xs font-bold text-gray-950">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
};

export const RecipeBrowser = ({ recipes }: RecipeBrowserProps) => {
  const t = useTranslations("hobby.recipes");
  const [query, setQuery] = useState("");
  const [selectedRecipeName, setSelectedRecipeName] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => filterRecipes(recipes, query), [query, recipes]);
  const selectedRecipe = recipes.find(recipe => recipe.name === selectedRecipeName);
  const emptyMessage = recipes.length === 0 ? t("empty") : t("noResults");
  const labels = {
    backToList: t("backToList"),
    detailAria: (name: string) => t("detailAria", { name }),
    ingredients: t("ingredients"),
    source: (source: string) => t("source", { source }),
    steps: t("steps"),
    summary: (recipe: Recipe) =>
      t("summary", { ingredients: recipe.ingredients.length, steps: recipe.recipe.length }),
    viewDetail: t("viewDetail"),
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    setSelectedRecipeName(null);
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <header className="border-b border-gray-800 pb-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
            Hobby / Recipes
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-50 md:text-4xl">{t("title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{t("description")}</p>
            </div>
            <p className="text-sm font-medium text-gray-300">
              {t("total", { count: recipes.length })}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900/70 p-3 md:flex-row md:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">{t("searchLabel")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
            <Input
              type="search"
              role="searchbox"
              aria-label={t("searchLabel")}
              value={query}
              onChange={event => handleSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-gray-700 bg-gray-950 pl-9 text-gray-100 placeholder:text-gray-500"
            />
          </label>
          <div className="text-sm text-gray-400">
            {query
              ? t("resultCount", { count: filteredRecipes.length })
              : t("displayCount", { count: filteredRecipes.length })}
          </div>
        </div>

        {selectedRecipe ? (
          <RecipeDetail
            recipe={selectedRecipe}
            labels={labels}
            onBack={() => setSelectedRecipeName(null)}
          />
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredRecipes.map(recipe => (
              <RecipeListItem
                key={recipe.name}
                recipe={recipe}
                labels={labels}
                onSelect={() => setSelectedRecipeName(recipe.name)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-12 text-center text-sm text-gray-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};
