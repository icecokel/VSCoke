"use client";

import SidebarLayout from "./SidebarLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Stack from "@mui/material/Stack";
import { useState } from "react";

interface ExplorerProps {
  isShowing: boolean;
}

const Search = ({ isShowing }: ExplorerProps) => {
  const data = {};
  const [keyword, setKeyword] = useState("");
  const handleChangeKeyword: React.KeyboardEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
  }) => {
    setKeyword(value);
  };
  return (
    <SidebarLayout isShowing={isShowing}>
      <Stack flexDirection={"row"} alignItems={"center"}>
        <ArrowForwardIosIcon className="mr-1 text-sm" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-sm border-[0.5px] border-gray-300 bg-gray-700 px-2 py-1 text-xs"
          defaultValue={keyword}
          onKeyDown={handleChangeKeyword}
        />
      </Stack>
    </SidebarLayout>
  );
};

export default Search;
