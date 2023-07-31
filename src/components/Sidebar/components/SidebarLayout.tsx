import Box from "@mui/material/Box";
import Slide from "@mui/material/Slide";
import { ReactNode } from "react";

interface SidebarLayoutProps {
  isShowing: boolean;
  children: ReactNode;
}

const SidebarLayout = ({ isShowing, children }: SidebarLayoutProps) => {
  return (
    <Slide direction="right" in={isShowing} mountOnEnter unmountOnExit>
      <Box
        className={
          "absolute left-12 z-10 h-screen w-[250px] border-r-2 border-r-gray-500 bg-gray-900 p-2 text-gray-100"
        }
      >
        {children}
      </Box>
    </Slide>
  );
};

export default SidebarLayout;