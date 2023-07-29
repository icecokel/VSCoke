"use client";

import Explorer from "./components/Explorer";
import Search from "./components/Search";
import { TSidebar } from "@/models/enum/sidebar";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { ReactNode, useState } from "react";
import { twMerge } from "tailwind-merge";

interface ILayoutProps {
  children: ReactNode;
}

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

const Sidebar = ({ children }: ILayoutProps) => {
  const [tab, setTab] = useState<TSidebar | "none">("none");

  const handleChangeTab: React.MouseEventHandler<HTMLInputElement> = ({
    currentTarget: { value },
  }) => {
    setTab(value === tab ? "none" : (value as TSidebar));
  };
  return (
    <Box className="flex bg-gray-900">
      <Box className="z-50 flex min-h-screen w-12 flex-col items-center gap-2 border-r-2 border-r-gray-500 bg-gray-900 py-2 text-gray-100">
        {TABS.map(({ name, icon }) => {
          return (
            <label
              key={`tab_${name}`}
              className={twMerge(
                "flex h-10 w-full cursor-pointer items-center justify-center border-l-2 bg-gray-900",
                name === tab ? "border-l-blue-100" : "border-l-gray-900"
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
      </Box>
      <Explorer isShowing={tab === "explore"} />
      <Search isShowing={tab === "search"} />
      <Container className="min-h-screen flex-1  text-white sm:p-1 md:p-5">
        {children}
      </Container>
    </Box>
  );
};

export default Sidebar;
