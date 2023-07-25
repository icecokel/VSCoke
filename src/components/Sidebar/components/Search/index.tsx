import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Box from "@mui/material/Box";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

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
    <Box
      className={twMerge(
        "hi  h-screen border-r-2 border-r-gray-500 bg-gray-900 p-2 text-gray-100",
        !isShowing ? "hidden" : "absolute left-12 z-10 w-[250px] xl:block"
      )}
    >
      <Box className="flex items-center">
        <ArrowForwardIosIcon className="mr-1 text-sm" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-sm border-[0.5px] border-gray-300 bg-gray-700 px-2 py-1 text-xs"
          value={keyword}
          onKeyDown={handleChangeKeyword}
        />
      </Box>
    </Box>
  );
};

export default Search;
