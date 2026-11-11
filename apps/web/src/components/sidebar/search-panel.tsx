"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useSearchIndex } from "@/hooks/use-search-index";
import { getRecommendedItems, searchItems } from "@/lib/search";
import { cn } from "@/lib/utils";
import { trackUsageEvent } from "@/lib/usage-analytics";
import type { SearchItem, SearchItemType } from "@/types/search";

interface SearchPanelProps {
  onNavigate?: () => void;
}

const TYPE_STYLE_MAP: Record<
  SearchItemType,
  { labelKey: string; icon: "article" | "account_box" | "terminal" }
> = {
  blog: { labelKey: "searchTypeBlog", icon: "article" },
  profile: { labelKey: "searchTypeProfile", icon: "account_box" },
  game: { labelKey: "searchTypeGame", icon: "terminal" },
  hobby: { labelKey: "searchTypeHobby", icon: "article" },
};

const SearchPanel = ({ onNavigate }: SearchPanelProps) => {
  const t = useTranslations("sidebar");
  const router = useCustomRouter();
  const { items: searchIndex, sources, retry } = useSearchIndex();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) return;

    const timeoutId = setTimeout(() => {
      void trackUsageEvent("search_used", "site_search");
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [trimmedQuery]);

  const results = useMemo(() => {
    if (!trimmedQuery) {
      return getRecommendedItems(searchIndex, 6);
    }
    return searchItems(searchIndex, trimmedQuery, 40);
  }, [trimmedQuery, searchIndex]);
  const selectedIndex = results[activeIndex] ? activeIndex : 0;
  const activeOptionId = results.length ? `${listId}-option-${selectedIndex}` : undefined;

  useEffect(() => {
    const container = resultsRef.current;
    const option = activeOptionRef.current;
    if (!container || !option) return;
    const bounds = container.getBoundingClientRect();
    const selected = option.getBoundingClientRect();
    if (selected.top < bounds.top + 1) {
      container.scrollTop -= bounds.top + 1 - selected.top;
    } else if (selected.bottom > bounds.bottom - 1) {
      container.scrollTop += selected.bottom - bounds.bottom + 1;
    }
  }, [activeOptionId, results]);

  const handleNavigate = (item: SearchItem) => {
    router.push(item.path, { title: item.title });
    onNavigate?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;

    if (e.key === "Escape") {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min((results[prev] ? prev : 0) + 1, results.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max((results[prev] ? prev : 0) - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        handleNavigate(selected);
      }
    }
  };

  const showRecommended = trimmedQuery.length === 0;
  const isLoading = !showRecommended && Object.values(sources).includes("loading");
  const hasError = !showRecommended && Object.values(sources).includes("error");

  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-2">
      <div className="relative">
        <Input
          autoFocus
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={results.length > 0}
          aria-activedescendant={activeOptionId}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          aria-label={t("searchPlaceholder")}
          data-testid="blog-dashboard-search-input"
          placeholder={t("searchPlaceholder")}
          className="h-9 border-gray-700 bg-gray-800 pl-9 text-gray-100 placeholder:text-gray-200"
        />
        <Icon
          kind="search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 px-1">
        <BaseText type="caption" className="text-gray-200">
          {showRecommended ? t("searchRecommended") : t("searchResults")}
        </BaseText>
        <BaseText
          type="caption"
          role="status"
          aria-live="polite"
          className={cn("text-gray-200", showRecommended && "sr-only")}
        >
          {t(isLoading ? "searchLoading" : "searchResultCount", { count: results.length })}
          {hasError && <span className="mt-1 block">{t("searchLoadError")}</span>}
        </BaseText>
      </div>

      {hasError && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={retry}
          className="mt-2 self-start border-gray-700 bg-gray-800 text-xs text-gray-100 hover:bg-gray-700"
        >
          {t("searchRetry")}
        </Button>
      )}

      <div
        ref={resultsRef}
        className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-700 bg-gray-900/60"
      >
        {results.length === 0 && !isLoading && !hasError && (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-200">
            {t("searchNoResult")}
          </div>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={t("searchResults")}
          hidden={results.length === 0}
        >
          {results.map((item, index) => {
            const typeStyle = TYPE_STYLE_MAP[item.type];
            const isActive = index === selectedIndex;

            return (
              <li key={item.id} role="presentation">
                <button
                  id={`${listId}-option-${index}`}
                  ref={isActive ? activeOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    setActiveIndex(index);
                    handleNavigate(item);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-2 border-b border-gray-800 px-3 py-2 text-left last:border-b-0",
                    isActive ? "bg-blue-500/20" : "hover:bg-gray-800/70",
                  )}
                >
                  <div className="pt-0.5 text-gray-300">
                    <Icon kind={typeStyle.icon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <BaseText type="body2" className="min-w-0 flex-1 truncate text-gray-100">
                        {item.title}
                      </BaseText>
                      <span className="shrink-0 whitespace-nowrap rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-200">
                        {t(typeStyle.labelKey)}
                      </span>
                    </div>
                    {item.description && (
                      <BaseText type="caption" className="mt-0.5 line-clamp-2 text-gray-200">
                        {item.description}
                      </BaseText>
                    )}
                    <BaseText
                      type="caption"
                      className="mt-0.5 block truncate text-[11px] text-gray-200"
                    >
                      {item.path}
                    </BaseText>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <BaseText type="caption" className="mt-2 px-1 text-[11px] text-gray-200">
        {t("searchHint")}
      </BaseText>
    </div>
  );
};

export default SearchPanel;
