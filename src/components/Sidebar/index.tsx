"use client";

import Explorer from "./components/Explorer";
import Search from "./components/Search";
import useClickOutSide from "@/hooks/useClickOutSide";
import { IHaveChildren } from "@/models/common";
import { TSidebar } from "@/models/enum/sidebar";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

const TABS = [
  {
    name: "explore",
    icon: <InsertDriveFileOutlinedIcon />,
  },

  {
    name: "search",
    icon: <SearchOutlinedIcon />,
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

  return (
    <Stack direction={"row"} ref={tabRef}>
      <Stack
        direction={"column"}
        gap={1}
        alignItems={"center"}
        className="z-50 min-h-screen w-[60px] border-r-[1px] border-r-gray-500 bg-gray-900 py-2 text-gray-100"
      >
        {TABS.map(({ name, icon }) => {
          return (
            <label
              key={`tab_${name}`}
              className={twMerge(
                "flex h-10 w-full cursor-pointer items-center justify-center border-l-2 bg-gray-900",
                name === tab ? "border-l-blue-100" : "border-l-gray-900",
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
      </Stack>
      <div>
        <Explorer isShowing={tab === "explore"} tabClose={tabClose} />
        <Search isShowing={tab === "search"} />
      </div>
      {children}
    </Stack>
  );
};

export default Sidebar;
