import { IHaveChildren } from "@/models/common";

interface SidebarLayoutProps extends IHaveChildren {
  isShowing: boolean;
  onRightClick?: React.MouseEventHandler;
}

const SidebarLayout = ({ isShowing, children, onRightClick }: SidebarLayoutProps) => {
  if (!isShowing) {
    return <></>;
  }

  return (
    <div className="animate-[slideRight_0.15s_ease-out]" style={{ animationFillMode: "forwards" }}>
      <div
        onContextMenu={onRightClick}
        className={
          "absolute z-10 h-screen min-w-[250px] max-w-[500px] border-r-2 border-r-gray-500 bg-gray-900 p-3 text-gray-100"
        }
      >
        {children}
      </div>
      {/* </Slide> */}
    </div>
  );
};

export default SidebarLayout;
