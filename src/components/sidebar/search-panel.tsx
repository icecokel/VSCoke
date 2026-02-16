"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useSearchIndex } from "@/hooks/use-search-index";
import { getRecommendedItems, searchItems } from "@/lib/search";
import { cn } from "@/lib/utils";
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
};

const SearchPanel = ({ onNavigate }: SearchPanelProps) => {
  const t = useTranslations("sidebar");
  const router = useCustomRouter();
  const searchIndex = useSearchIndex();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery) {
      return getRecommendedItems(searchIndex, 6);
    }
    return searchItems(searchIndex, debouncedQuery, 40);
  }, [debouncedQuery, searchIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  const handleNavigate = (item: SearchItem) => {
    router.push(item.path, { title: item.title });
    onNavigate?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[activeIndex] ?? results[0];
      if (selected) {
        handleNavigate(selected);
      }
    }
  };

  const showRecommended = debouncedQuery.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-2">
      <div className="relative">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("searchPlaceholder")}
          className="h-9 border-gray-700 bg-gray-800 pl-9 text-gray-100 placeholder:text-gray-500"
        />
        <Icon
          kind="search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <BaseText type="caption" className="text-gray-400">
          {showRecommended ? t("searchRecommended") : t("searchResults")}
        </BaseText>
        {!showRecommended && (
          <BaseText type="caption" className="text-gray-500">
            {t("searchResultCount", { count: results.length })}
          </BaseText>
        )}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-700 bg-gray-900/60">
        {results.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500">
            {t("searchNoResult")}
          </div>
        ) : (
          <ul>
            {results.map((item, index) => {
              const typeStyle = TYPE_STYLE_MAP[item.type];
              const isActive = index === activeIndex;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(item)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-gray-800 px-3 py-2 text-left last:border-b-0",
                      isActive ? "bg-blue-500/20" : "hover:bg-gray-800/70",
                    )}
                  >
                    <div className="pt-0.5 text-gray-300">
                      <Icon kind={typeStyle.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BaseText type="body2" className="truncate text-gray-100">
                          {item.title}
                        </BaseText>
                        <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-300">
                          {t(typeStyle.labelKey)}
                        </span>
                      </div>
                      {item.description && (
                        <BaseText type="caption" className="mt-0.5 line-clamp-2 text-gray-400">
                          {item.description}
                        </BaseText>
                      )}
                      <BaseText
                        type="caption"
                        className="mt-0.5 block truncate text-[11px] text-gray-500"
                      >
                        {item.path}
                      </BaseText>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BaseText type="caption" className="mt-2 px-1 text-[11px] text-gray-500">
        {t("searchHint")}
      </BaseText>
    </div>
  );
};

export default SearchPanel;
