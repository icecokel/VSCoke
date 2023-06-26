import Box from "@mui/material/Box";
import { ReactNode } from "react";

interface ILayoutProps {
  children: ReactNode;
}

const LayoutContext = ({ children }: ILayoutProps) => {
  return (
    <Box sx={{ display: "flex" }}>
      <Box className="gray-900 w-3">layout</Box>
      <Box className="flex-1">{children}</Box>
    </Box>
  );
};

export default LayoutContext;
