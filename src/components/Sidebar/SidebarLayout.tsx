import { IHaveChildren } from "@/models/common";
import Slide from "@mui/material/Slide";

interface SidebarLayoutProps extends IHaveChildren {
  isShowing: boolean;
  onRightClick?: React.MouseEventHandler;
}

const SidebarLayout = ({ isShowing, children, onRightClick }: SidebarLayoutProps) => {
  return (
    <Slide direction="right" in={isShowing} mountOnEnter unmountOnExit>
      <div
        onContextMenu={onRightClick}
        className={
          "absolute z-10 h-screen w-[250px] border-r-2 border-r-gray-500 bg-gray-900 p-2 text-gray-100 md:left-12"
        }
      >
        {children}
      </div>
    </Slide>
  );
};

export default SidebarLayout;
