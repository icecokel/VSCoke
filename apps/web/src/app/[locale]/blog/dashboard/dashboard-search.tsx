"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import PostList from "@/components/blog/post-list";
import BaseText from "@/components/base-ui/text";
import { PostMeta } from "@/types/blog";
import { useBoolean } from "@/hooks/use-boolean";
import { useTranslations } from "next-intl";

interface DashboardSearchProps {
  posts: PostMeta[];
}

export default function DashboardSearch({ posts }: DashboardSearchProps) {
  const t = useTranslations("blog");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filtered, setFiltered] = useState(posts);
  const [suggestions, setSuggestions] = useState<PostMeta[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const dropdown = useBoolean(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    dropdown.onTrue();
  };

  useEffect(() => {
    // 쿼리가 비어있으면 전체 목록 & 제안 닫기
    if (!debouncedQuery) {
      setFiltered(posts);
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      return;
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    const results = posts.filter(p => p.title.toLowerCase().includes(lowerQuery));

    setFiltered(results);
    setSuggestions(results.slice(0, 5)); // 상위 5개 제안
    setActiveSuggestionIndex(-1);
  }, [debouncedQuery, posts]);

  // Handle suggestion click
  const handleSelect = (title: string) => {
    setQuery(title);
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
