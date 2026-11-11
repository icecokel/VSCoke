"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import PostList from "@/components/blog/post-list";
import BaseText from "@/components/base-ui/text";
import { PostMeta } from "@/types/blog";
import { useBoolean } from "@/hooks/use-boolean";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { CustomLink } from "@/components/custom-link";

interface DashboardSearchProps {
  posts: PostMeta[];
}

export default function DashboardSearch({ posts }: DashboardSearchProps) {
  const t = useTranslations("blog");
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const category = posts.some(post => post.category === requestedCategory)
    ? requestedCategory
    : null;
  const categoryLabel =
    category === "dev"
      ? t("detail.development")
      : category === "journal"
        ? t("detail.journal")
        : category;
  const storageKey = `vscoke:blog-dashboard-query:${useLocale()}`;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchReady, setIsSearchReady] = useState(false);
  const filtered = useMemo(() => {
    const lowerQuery = debouncedQuery.toLowerCase();
    return posts.filter(
      post =>
        (!category || post.category === category) && post.title.toLowerCase().includes(lowerQuery),
    );
  }, [category, debouncedQuery, posts]);
  const [suggestions, setSuggestions] = useState<PostMeta[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const dropdown = useBoolean(false);

  useEffect(() => {
    let savedQuery = "";
    try {
      savedQuery = sessionStorage.getItem(storageKey) ?? "";
    } catch {
      // 저장소가 차단되면 빈 검색으로 시작한다.
    }
    setQuery(savedQuery);
    setDebouncedQuery(savedQuery);
    setIsSearchReady(true);
  }, [storageKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const updateQuery = (value: string) => {
    setQuery(value);
    try {
      if (value) sessionStorage.setItem(storageKey, value);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // 저장 실패와 관계없이 현재 화면의 검색은 계속 동작한다.
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery(e.target.value);
    dropdown.onTrue();
  };

  useEffect(() => {
    setSuggestions(debouncedQuery ? filtered.slice(0, 5) : []);
    setActiveSuggestionIndex(-1);
  }, [debouncedQuery, filtered]);

  // Handle suggestion click
  const handleSelect = (title: string) => {
    updateQuery(title);
    setDebouncedQuery(title);
    setActiveSuggestionIndex(-1);
    dropdown.onFalse();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      dropdown.onFalse();
      setActiveSuggestionIndex(-1);
      return;
    }

    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      dropdown.onTrue();
      setActiveSuggestionIndex(previous => Math.min(previous + 1, suggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      dropdown.onTrue();
      setActiveSuggestionIndex(previous => (previous <= 0 ? suggestions.length - 1 : previous - 1));
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[activeSuggestionIndex];
      if (selected) {
        handleSelect(selected.title);
      }
    }
  };

  const showSuggestions = dropdown.value && suggestions.length > 0 && query.length > 0;

  return (
    <div className="space-y-6">
      {category && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>{t("dashboardCategory", { category: categoryLabel ?? category })}</span>
          <CustomLink
            href="/blog/dashboard"
            title={t("dashboardTitle")}
            className="inline-flex min-h-10 items-center rounded-md px-2 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("dashboardViewAll")}
          </CustomLink>
        </div>
      )}
      <div
        className="relative"
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            dropdown.onFalse();
          }
        }}
      >
        <Input
          data-testid="blog-dashboard-title-search-input"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="blog-dashboard-title-suggestions"
          aria-expanded={showSuggestions}
          aria-activedescendant={
            activeSuggestionIndex >= 0
              ? `blog-dashboard-title-suggestion-${activeSuggestionIndex}`
              : undefined
          }
          aria-label={t("dashboardSearchPlaceholder")}
          placeholder={t("dashboardSearchPlaceholder")}
          disabled={!isSearchReady}
          value={query}
          onChange={handleQueryChange}
          onFocus={dropdown.onTrue}
          onKeyDown={handleKeyDown}
          className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
        />

        {/* Autocomplete Dropdown */}
        {showSuggestions && (
          <ul
            id="blog-dashboard-title-suggestions"
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-700 bg-gray-900 shadow-lg"
          >
            {suggestions.map((post, index) => (
              <li key={post.slug} className="border-b border-gray-800 last:border-0">
                <button
                  id={`blog-dashboard-title-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  tabIndex={-1}
                  className={`w-full cursor-pointer p-3 text-left text-gray-200 hover:bg-gray-800 ${
                    index === activeSuggestionIndex ? "bg-gray-800" : ""
                  }`}
                  onClick={() => handleSelect(post.title)}
                >
                  <BaseText type="body2">{post.title}</BaseText>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PostList posts={filtered} />
    </div>
  );
}
