"use client";

import Explorer from "./Explorer";
import Search from "./Search";
import useClickOutSide from "@/hooks/useClickOutSide";
import useShortCut from "@/hooks/useShortCut";
import { IHaveChildren } from "@/models/common";
import { TSidebar } from "@/models/enum/sidebar";
import Icon from "@ui/Icon";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

const TABS = [
  {
    name: "explore",
    icon: <Icon kind="content_copy" />,
  },

  {
    name: "search",
    icon: <Icon kind="search" />,
  },
];

const Sidebar = ({ children }: IHaveChildren) => {
  const [tab, setTab] = useState<TSidebar | "none">("none");
  const tabClose = () => {
    setTab("none");
  };

  const tabRef = useClickOutSide(tabClose);

  const handleChangeTab: React.MouseEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
  }) => {
    setTab(value === tab ? "none" : (value as TSidebar));
  };

  useShortCut(["escape"], tabClose);

  useShortCut(["control", "shift", "f"], () => {
    setTab(prev => {
      return prev !== "search" ? "search" : "none";
    });
  });

  useShortCut(["control", "b"], () => {
    setTab(prev => {
      return prev !== "explore" ? "explore" : "none";
    });
  });

  return (
    <div className="flex">
      <div className="flex" ref={tabRef}>
        <div className="flex-col gap-1 items-center md:flex hidden z-20 min-h-screen w-[50px] border-r-[1px] border-r-gray-500 bg-gray-900 py-2 text-gray-100">
          {TABS.map(({ name, icon }) => {
            return (
              <label
                key={`tab_${name}`}
                className={twMerge(
                  "flex h-10 w-full cursor-pointer items-center justify-center border-l-2 bg-gray-900",
                  name === tab ? "border-l-blue-300" : "border-l-gray-900",
                )}
              >
                {icon}
                <input
                  type="radio"
                  name="tabs"
                  defaultValue={name}
                  className="hidden"
                  onClick={handleChangeTab}
                />
              </label>
            );
          })}
        </div>
        <Explorer isShowing={tab === "explore"} tabClose={tabClose} />
        <Search isShowing={tab === "search"} />
      </div>

      <div className="flex md:hidden fixed bottom-0 p-[10px] gap-1 z-10">
        {TABS.map(({ name, icon }) => {
          return (
            <div
              className="rounded-3xl flex items-center justify-center w-[50px] h-[50px] bg-gray-50 shadow-[2px_4px_4px_rgb(0,0,0,0.4)]"
              key={`tab_${name}`}
            >
              <label>
                {icon}
                <input
                  type="radio"
                  name="tabs"
                  defaultValue={name}
                  className="hidden"
                  onClick={handleChangeTab}
                />
              </label>
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
};

export default Sidebar;
