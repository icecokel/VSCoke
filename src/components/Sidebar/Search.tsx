"use client";

import SidebarLayout from "./SidebarLayout";
import useHistory from "@/hooks/useHistory";
import { IResult, searchPost } from "@/utils/get/post";
import Icon from "@ui/Icon";
import { useState } from "react";

interface ExplorerProps {
  isShowing: boolean;
}

const Search = ({ isShowing }: ExplorerProps) => {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<IResult[]>([]);
  const { add } = useHistory();
  const handleChangeKeyword: React.KeyboardEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
    code,
  }) => {
    setKeyword(value);
    if (code === "Enter") {
      setResults(searchPost(keyword));
    }
  };

  const handleClickPost = ({ title, path }: IResult) => {
    add({ title, path, isActive: true });
  };

  return (
    <SidebarLayout isShowing={isShowing}>
      <div className="flex items-center">
        <Icon kind="navigate_next" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-sm border-[0.5px] border-gray-300 bg-gray-700 px-2 py-1 text-xs"
          defaultValue={keyword}
          onKeyDown={handleChangeKeyword}
        />
      </div>
      {results.length > 0 && (
        <div className="mt-[20px] ml-3">
          {results.map((post, index) => {
            return (
              <div
                className="truncate h-[1.5em] w-[220px] my-[0.5em] cursor-pointer hover:text-yellow-200"
                key={`${index} ${post.title}`}
                onClick={() => handleClickPost(post)}
              >
                {post.title}
              </div>
            );
          })}
        </div>
      )}
    </SidebarLayout>
  );
};

export default Search;
