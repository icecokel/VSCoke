import Explorer from "../Explorer";
import Search from "../Search";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Head from "next/head";
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
        <InsertDriveFileOutlinedIcon className="ml-[-20px] mt-[-5px] " />
      </>
    ),
  },

  {
    name: "search",
    icon: <SearchOutlinedIcon />,
  },
];

type TTab = "file" | "search";

const Layout = ({ children }: ILayoutProps) => {
  const [tab, setTab] = useState<TTab>("file");

  const handleChangeTab: React.MouseEventHandler<HTMLDivElement> = ({
    currentTarget: { id },
  }) => {
    setTab(id as TTab);
  };
  return (
    <>
      <Head>
        <title>VSCODE</title>
      </Head>
      <Box className="flex bg-gray-900">
        <Box className="flex min-h-screen w-12 flex-col items-center gap-2 border-r-2 border-r-gray-500 bg-gray-900 py-2 text-gray-100">
          {TABS.map(({ name, icon }) => {
            return (
              <>
                {tab === name ? (
                  <Box
                    key={`tab_${name}`}
                    id={name}
                    onClick={handleChangeTab}
                    className="flex h-10 w-full cursor-pointer items-center justify-center border-l-2 border-l-blue-100 bg-gray-900"
                  >
                    {icon}
                  </Box>
                ) : (
                  <Box
                    key={`tab_${name}`}
                    id={name}
                    onClick={handleChangeTab}
                    className="flex h-10 w-full cursor-pointer items-center justify-center border-l-2 border-l-gray-900 bg-gray-900"
                  >
                    {icon}
                  </Box>
                )}
              </>
            );
          })}
        </Box>
        {tab === "file" ? <Explorer /> : <Search />}
        <Container className="min-h-screen flex-1 p-20 text-white md:p-10">
          {children}
        </Container>
      </Box>
    </>
  );
};

export default Layout;
