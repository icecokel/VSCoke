"use client";

import { TParentNode } from "@/models/common";
import Slide from "@ui/slide";

interface SidebarLayoutProps extends TParentNode {
  isShowing: boolean;
}

const SidebarLayout = ({ isShowing, children }: SidebarLayoutProps) => {
  return (
    <div className="absolute md:ml-[50px] z-30">
      <Slide active={isShowing} direction="right">
        <div
          className={
            "z-10 h-screen min-w-[250px] max-w-[500px] border-r-2 border-r-gray-500 bg-gray-900 p-3 text-gray-100"
          }
        >
          {children}
        </div>
      </Slide>
    </div>
  );
};

export default SidebarLayout;
