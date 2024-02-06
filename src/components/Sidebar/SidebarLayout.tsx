import Slide from "../baseUi/Slide";
import { IHaveChildren } from "@/models/common";

interface SidebarLayoutProps extends IHaveChildren {
  isShowing: boolean;
  onRightClick?: React.MouseEventHandler;
}

const SidebarLayout = ({ isShowing, children, onRightClick }: SidebarLayoutProps) => {
  return (
    <Slide active={isShowing} direction="right">
      <div
        onContextMenu={onRightClick}
        className={
          "absolute z-10 h-screen min-w-[250px] max-w-[500px] border-r-2 border-r-gray-500 bg-gray-900 p-3 text-gray-100"
        }
      >
        {children}
      </div>
    </Slide>
  );
};

export default SidebarLayout;
