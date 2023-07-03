import Explorer from "../Explorer";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import { ReactNode, useState } from "react";

interface ILayoutProps {
  children: ReactNode;
}

const TABS = [
  {
    name: "file",
    icon: (
      <>
        <InsertDriveFileOutlinedIcon />
        <InsertDriveFileOutlinedIcon className="ml-[-20px] mt-[-5px]" />
      </>
    ),
  },

  {
    name: "search",
    icon: <SearchOutlinedIcon />,
  },
];

type TTab = "file" | "search";

const LayoutContext = ({ children }: ILayoutProps) => {
  const [tab, setTab] = useState<TTab>("file");

  const handleChangeTab: React.MouseEventHandler<HTMLDivElement> = ({ currentTarget: { id } }) => {
    setTab(id as TTab);
  };
  return (
    <Box className="flex">
      <Box className="flex h-screen w-12 flex-col items-center gap-2 bg-gray-900 py-2 text-gray-100 border-r-2 border-r-gray-500">
        {TABS.map(({ name, icon }) => {
          const className =
            "flex h-10 w-full items-center justify-center" + tab === name
              ? "border-l-2 border-l-blue-100"
              : "border-l-2 border-l-gray-900";
          return (
            <Box key={`tab_${name}`} id={name} onClick={handleChangeTab} className={className}>
              {icon}
            </Box>
          );
        })}
      </Box>
      {tab === "file" && <Explorer />}
      <Box className="flex-1">{children}</Box>
    </Box>
  );
};

export default LayoutContext;
