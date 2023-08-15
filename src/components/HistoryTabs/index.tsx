"use client";

import { IHistoryItem, historyAtom } from "@/atom/history";
import { IHaveChildren } from "@/models/common";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useAtom } from "jotai/react";
import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";

const HistoryTabs = ({ children }: IHaveChildren) => {
  const [history, setHistory] = useAtom(historyAtom);
  const { push } = useRouter();

  const handleClickTab = ({ isAactive, path, title }: IHistoryItem) => {
    if (!isAactive) {
      push(path);
      setHistory(prev => prev.map(item => ({ ...item, isAactive: item.path === path })));
    }
  };

  const handleRightClickTab = () => {
    console.log("우클릭");
  };

  return (
    <div className="w-full bg-gray-800">
      <Stack direction={"row"} className="bg-gray-900">
        {history.map(({ isAactive, path, title }) => (
          <Tooltip key={`tab_${path}`} title={`${path}/${title}`}>
            <div
              className={twMerge(
                "border border-gray-300/60 border-l-[0px]",
                isAactive && "bg-gray-800 border-b-[0px]",
              )}
              onClick={() => handleClickTab({ isAactive, path, title })}
              onContextMenu={handleRightClickTab}
            >
              <Typography
                className={twMerge(
                  "text-gray-300/80 py-[6px] px-[20px]",
                  isAactive && "text-yellow-200/95 font-medium border-t border-t-blue-100 pt-[5px]",
                )}
                fontSize={14}
              >
                {title}
              </Typography>
            </div>
          </Tooltip>
        ))}
      </Stack>
      <Container maxWidth={"lg"} className="min-h-screen flex-1 text-white sm:p-1 md:p-5 ">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
