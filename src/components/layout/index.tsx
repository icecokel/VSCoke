import Box from "@mui/material/Box";
import { ReactNode, useState } from "react";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

interface ILayoutProps {
  children: ReactNode;
}

type TMode = "file" | "search";

const LayoutContext = ({ children }: ILayoutProps) => {
  const [mode, setMode] = useState<TMode>("file");
  return (
    <Box className="flex">
      <Box className="bg-gray-900 w-12 flex text-gray-100 flex-col items-center gap-2 py-2 h-screen">
        <Box>
          <InsertDriveFileOutlinedIcon />
          <InsertDriveFileOutlinedIcon className="ml-[-20px] mt-[-5px]" />
        </Box>
        <Box>
          <SearchOutlinedIcon />
        </Box>
      </Box>
      <Box className="flex-1">{children}</Box>
    </Box>
  );
};

export default LayoutContext;
