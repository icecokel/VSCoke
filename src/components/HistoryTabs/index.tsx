"use client";

import { IHistoryItem } from "@/atom/history";
import useHistory from "@/hooks/useHistory";
import { IHaveChildren } from "@/models/common";
import CloseIcon from "@mui/icons-material/Close";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { twMerge } from "tailwind-merge";

const HistoryTabs = ({ children }: IHaveChildren) => {
  const { history, change, remove } = useHistory();

  const handleClickTab = change;
  const handleClickClose = remove;

  const handleRightClickTab = () => {
    console.log("우클릭");
  };

  // TODO 드래그 기능 추가

  return (
    <div className="w-full bg-gray-800">
      <Stack direction={"row"} className="bg-gray-900">
        {history.map(item => (
          <Tooltip key={`tab_${item.path}`} title={`${item.path}/${item.title}`}>
            <div
              className={twMerge(
                "border border-gray-300/60 border-l-[0px]",
                item.isAactive && "bg-gray-800 border-b-[0px]",
              )}
              onClick={() => handleClickTab(item)}
              onContextMenu={handleRightClickTab}
            >
              <Typography
                className={twMerge(
                  "text-gray-300/80 md:py-[6px] md:px-[20px] py-[4px] px-[8px]",
                  item.isAactive &&
                    "text-yellow-200/95 font-medium border-t pt-[1px] border-t-blue-100 md:pt-[5px]",
                )}
                fontSize={14}
              >
                {item.title}
                <CloseIcon
                  sx={{ fontSize: 15, fontWeight: 700 }}
                  className={twMerge(
                    "ml-[4px] mr-[-4px] md:ml-[8px] md:mr-[-8px]",
                    !item.isAactive && "hidden",
                  )}
                  onClick={() => handleClickClose(item)}
                />
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
