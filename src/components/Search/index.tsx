import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Box from "@mui/material/Box";
import { useState } from "react";

const Search = () => {
  const data = {};
  const [keyword, setKeyword] = useState("");
  const handleChangeKeyword: React.KeyboardEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
  }) => {
    setKeyword(value);
  };
  return (
    <Box className="bg-gray-900  text-gray-100 h-screen min-w-[250px] p-2">
      <Box className="flex items-center">
        <ArrowForwardIosIcon className="text-sm mr-1" />
        <input
          type="text"
          placeholder="Search"
          className="w-full text-xs py-1 px-2 bg-gray-700 border-gray-300 border-[0.5px] rounded-sm"
          value={keyword}
          onKeyDown={handleChangeKeyword}
        />
      </Box>
    </Box>
  );
};

export default Search;
