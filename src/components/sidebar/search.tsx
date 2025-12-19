"use client";

import SidebarLayout from "./sidebar-layout";
import { useHistory } from "@/hooks/use-history";
import Icon from "@/components/base-ui/icon";
import { useState } from "react";

interface SearchProps {
  isShowing: boolean;
}

const Search = ({ isShowing }: SearchProps) => {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Array<{ title: string; path: string; excerpt?: string }>>(
    [],
  );
  const { add } = useHistory();

  const handleChangeKeyword: React.KeyboardEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
    code,
  }) => {
    setKeyword(value);
    if (code === "Enter" && value.trim()) {
      // 검색 기능 미구현 - 빈 결과 반환
      setResults([]);
    }
  };

  const handleClickPost = (result: { title: string; path: string }) => {
    add({ title: result.title, path: result.path, isActive: true });
  };

  return (
    <SidebarLayout isShowing={isShowing}>
      <div className="flex items-center">
        <Icon kind="navigate_next" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-xs border-[0.5px] border-gray-300 bg-gray-700 px-2 py-1 text-xs"
          defaultValue={keyword}
          onKeyDown={handleChangeKeyword}
        />
      </div>
      {results.length > 0 && (
        <div className="mt-[20px] ml-3">
          {results.map((post, index) => (
            <div
              key={`${index}_${post.title}`}
              className="group cursor-pointer my-[0.5em]"
              onClick={() => handleClickPost(post)}
            >
              <div className="truncate w-full hover:text-yellow-200">{post.title}</div>
              {post.excerpt && (
                <div className="text-xs text-gray-400 truncate w-full hidden group-hover:block">
                  {post.excerpt}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SidebarLayout>
  );
};

export default Search;
