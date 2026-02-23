"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import PostList from "@/components/blog/post-list";
import BaseText from "@/components/base-ui/text";
import { PostMeta } from "@/types/blog";
import { useBoolean } from "@/hooks/use-boolean";

interface DashboardSearchProps {
  posts: PostMeta[];
}

export default function DashboardSearch({ posts }: DashboardSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filtered, setFiltered] = useState(posts);
  const [suggestions, setSuggestions] = useState<PostMeta[]>([]);
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
      return;
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    const results = posts.filter(p => p.title.toLowerCase().includes(lowerQuery));

    setFiltered(results);
    setSuggestions(results.slice(0, 5)); // 상위 5개 제안
  }, [debouncedQuery, posts]);

  // Handle suggestion click
  const handleSelect = (title: string) => {
    setQuery(title);
    setDebouncedQuery(title);
    dropdown.onFalse();
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Input
          placeholder="제목으로 검색..."
          value={query}
          onChange={handleQueryChange}
          onFocus={dropdown.onTrue}
          onBlur={() => setTimeout(dropdown.onFalse, 150)}
          className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
        />

        {/* Autocomplete Dropdown */}
        {dropdown.value && suggestions.length > 0 && query && (
          <ul className="absolute z-10 w-full bg-gray-900 border border-gray-700 mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map(post => (
              <li
                key={post.slug}
                className="p-3 hover:bg-gray-800 cursor-pointer text-gray-200 border-b border-gray-800 last:border-0"
                onClick={() => handleSelect(post.title)}
              >
                <BaseText type="body2">{post.title}</BaseText>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PostList posts={filtered} />
    </div>
  );
}
