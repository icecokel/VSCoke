"use client";

import Explorer from "./explorer";
import Search from "./search";
import useClickOutSide from "@/hooks/use-click-out-side";
import useShortCut from "@/hooks/use-short-cut";
import { TParentNode } from "@/models/common";
import { TSidebar } from "@/models/enum/sidebar";
import Icon from "@/components/base-ui/icon";
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

const TABS = [
  {
    name: "explore",
    icon: <Icon kind="content_copy" />,
  },
];

const Sidebar = ({ children }: TParentNode) => {
  const [tab, setTab] = useState<TSidebar | "none">("none");

  useEffect(() => {
    const savedTab = localStorage.getItem("sidebar_tab");
    if (savedTab) {
      setTab(savedTab as TSidebar | "none");
    }
  }, []);

  const updateTab = (newTab: TSidebar | "none") => {
    setTab(newTab);
    localStorage.setItem("sidebar_tab", newTab);
  };

  const currentTabClose = (event?: MouseEvent) => {
    if (event?.target instanceof Element) {
      // Check if click is inside menubar
      const menubar = document.getElementById("menubar");
      if (menubar && menubar.contains(event.target)) {
        return;
      }
      // Check if click is inside any dropdown menu (Radix UI portal)
      if (event.target.closest('[data-slot^="dropdown-menu"]')) {
        return;
      }
    }
    updateTab("none");
  };

  const tabRef = useClickOutSide(currentTabClose);

  const handleChangeTab: React.MouseEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
  }) => {
    const newTab = value === tab ? "none" : (value as TSidebar);
    updateTab(newTab);
  };

  useShortCut(["escape"], () => updateTab("none"));

  useShortCut(["control", "shift", "f"], () => {
    if (tab !== "search") {
      updateTab("search");
    } else {
      updateTab("none");
    }
  });

  useShortCut(["control", "b"], () => {
    if (tab !== "explore") {
      updateTab("explore");
    } else {
      updateTab("none");
    }
  });

  return (
    <div className="flex">
      <div className="flex" ref={tabRef}>
        <div className="flex-col gap-1 items-center md:flex hidden z-20 min-h-screen w-[50px] border-r border-r-gray-500 bg-gray-900 py-2 text-gray-100">
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
        <Explorer isShowing={tab === "explore"} tabClose={() => updateTab("none")} />
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
