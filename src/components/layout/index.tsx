import Box from "@mui/material/Box";
import { ReactNode } from "react";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
interface ILayoutProps {
  children: ReactNode;
}

const LayoutContext = ({ children }: ILayoutProps) => {
  return (
    <Box className="flex">
      <Box className="bg-gray-900 w-12 flex">
        <Box className="text-gray-100">
          <InsertDriveFileOutlinedIcon />
          <InsertDriveFileOutlinedIcon className="ml-[-20px] mt-[-5px]" />
        </Box>
      </Box>
      <Box className="flex-1">{children}</Box>
    </Box>
  );
};

export default LayoutContext;
