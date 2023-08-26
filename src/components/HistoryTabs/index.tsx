"use client";

import { IHistoryItem } from "@/atom/history";
import useHistory from "@/hooks/useHistory";
import { IHaveChildren } from "@/models/common";
import CloseIcon from "@mui/icons-material/Close";
import Container from "@mui/material/Container";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Fragment, useState } from "react";
import { twMerge } from "tailwind-merge";

const HistoryTabs = ({ children }: IHaveChildren) => {
  const [currentEl, setCurrentEl] = useState<null | HTMLElement>(null);
  const { history, change, remove, setHistory } = useHistory();

  const handleClickTab = change;
  const handleClickClose = remove;
  const open = Boolean(currentEl);

  const handleRightClickTab: React.MouseEventHandler<HTMLDivElement> = event => {
    event.preventDefault();
    setCurrentEl(event.currentTarget);
  };

  const onClose = () => {
    setCurrentEl(null);
  };

  const [dragStartPath, setDragStartPath] = useState<string>();
  const [dragEnterPath, setEnterPath] = useState<string>();

  const handleClickCloseMenu = (target: IHistoryItem) => {
    remove(target);
    setCurrentEl(null);
  };

  const handleDragStart = ({ currentTarget: { id } }: React.MouseEvent<HTMLDivElement>) => {
    setDragStartPath(id);
  };

  const handleDragEnter = ({ currentTarget: { id } }: React.MouseEvent<HTMLDivElement>) => {
    if (id && dragStartPath !== id) {
      setEnterPath(id);
    }
  };

  const handleDragEnd = () => {
    if (dragStartPath !== dragEnterPath) {
      const clickedTab = history.find(({ path }) => path == dragStartPath);
      const targetTabIndex = history.findIndex(({ path }) => path == dragEnterPath);
      if (clickedTab) {
        const historyToUodate = [...history]
          .filter(({ path }) => path !== clickedTab?.path)
          .map(item => ({ ...item, isAactive: false }));
        historyToUodate.splice(targetTabIndex, 0, { ...clickedTab, isAactive: true });
        setHistory(historyToUodate);
      }
    }
  };

  return (
    <div className="w-full bg-gray-800">
      <Stack direction={"row"} className="bg-gray-900">
        {history.map(item => (
          <Fragment key={`tab_${item.path}`}>
            <Tooltip title={`${item.path}/${item.title}`}>
              <div
                id={item.path}
                className={twMerge(
                  "border border-gray-300/60 border-l-[0px]",
                  item.isAactive && "bg-gray-800 border-b-[0px]",
                )}
                onClick={() => handleClickTab(item)}
                onContextMenu={handleRightClickTab}
                onDragStart={handleDragStart}
                onDragEnterCapture={handleDragEnter}
                onDragEnd={handleDragEnd}
                draggable
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
            <Menu
              id="basic-menu"
              anchorEl={currentEl}
              open={open}
              onClose={onClose}
              MenuListProps={{
                sx: {
                  bgcolor: "#181818",
                  color: "#D7D7D7",
                  fontSize: "12px",
                  padding: "2px 4px",
                  width: "30vw",
                  minWidth: "120px",
                  borderColor: "#8C8C8C",

                  li: {
                    padding: "2px 20px",
                    borderRadius: "4px",
                    "&:hover": {
                      bgcolor: "#323232",
                    },
                  },
                },
              }}
            >
              <MenuItem onClick={() => handleClickCloseMenu(item)}>close</MenuItem>
            </Menu>
          </Fragment>
        ))}
      </Stack>
      <Container maxWidth={"lg"} className="min-h-screen flex-1 text-white sm:p-1 md:p-5 ">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
