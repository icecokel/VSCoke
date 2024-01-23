"use client";

import useHistory from "@/hooks/useHistory";
import { IHaveChildren } from "@/models/common";
import CloseIcon from "@mui/icons-material/Close";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Container from "@ui/Container";
import BaseText from "@ui/Text";
import Tooltip from "@ui/Tooltip";
import { useRouter } from "next/navigation";
import { Fragment, useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

const HistoryTabs = ({ children }: IHaveChildren) => {
  const [currentEl, setCurrentEl] = useState<null | HTMLElement>(null);
  const { history, change, remove, setHistory, current, add } = useHistory();
  const router = useRouter();

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

  const onClickMenu =
    (menu: "close" | "closeOthers" | "closeAll") => (target: HTMLElement | null) => {
      if (target) {
        const foundTab = history.find(({ path }) => path === target.id);
        switch (menu) {
          case "close": {
            if (foundTab) {
              remove(foundTab);
            }
            break;
          }

          case "closeOthers": {
            if (foundTab) {
              setHistory(prev => [{ ...foundTab, isActive: true }]);
              router.push(foundTab.path);
            }
            break;
          }

          case "closeAll": {
            setHistory([]);
            router.push("/");
          }
        }
      }
      setCurrentEl(null);
    };

  const handleClickCloseMenu = onClickMenu("close");
  const handleClickCloseOuters = onClickMenu("closeOthers");
  const handleClickCloseAll = onClickMenu("closeAll");

  const handleDragStart = ({ currentTarget: { id } }: React.MouseEvent<HTMLDivElement>) => {
    const clickedTab = history.find(({ path }) => path === id);
    if (clickedTab) {
      setDragStartPath(id);
      change(clickedTab);
      router.push(id);
    }
  };

  const handleDragEnter = ({ currentTarget }: React.MouseEvent<HTMLDivElement>) => {
    const { id } = currentTarget;
    if (id && dragStartPath && dragStartPath !== id) {
      setEnterPath(id);
    }
  };

  const handleDragEnd = () => {
    if (dragStartPath && dragEnterPath && dragStartPath !== dragEnterPath) {
      const clickedTab = history.find(({ path }) => path == dragStartPath);
      const targetTabIndex = history.findIndex(({ path }) => path == dragEnterPath);
      if (clickedTab) {
        const historyToUpdate = [...history]
          .filter(({ path }) => path !== clickedTab?.path)
          .map(item => ({ ...item, isActive: false }));
        historyToUpdate.splice(targetTabIndex, 0, { ...clickedTab, isActive: true });
        setHistory(historyToUpdate);
      }
    }
  };

  useEffect(() => {
    if (history.length === 0) {
      router.replace("/");
      return;
    }

    if (current) {
      router.replace(current.path);
      return;
    } else {
      add(history[0]);
    }
  }, [history]);

  return (
    <div className="w-full bg-gray-800">
      <div className="flex bg-gray-900">
        {history.map(item => (
          <Fragment key={`tab_${item.path}`}>
            <Tooltip text={`${item.path}/${item.title}`}>
              <div
                id={item.path}
                className={twMerge(
                  "border border-gray-300/60 border-l-[0px]",
                  item.isActive ? "bg-gray-800 border-b-[0px]" : "hover:bg-gray-600",
                )}
                onClick={() => handleClickTab(item)}
                onContextMenu={handleRightClickTab}
                onDragStart={handleDragStart}
                onDragEnterCapture={handleDragEnter}
                onDragEnd={handleDragEnd}
                draggable
              >
                <BaseText
                  className={twMerge(
                    "text-gray-300/80 md:py-[6px] md:px-[20px] py-[4px] px-[8px] text-sm",
                    item.isActive &&
                      "text-yellow-200/95 font-medium border-t pt-[1px] border-t-blue-300 md:pt-[5px]",
                  )}
                >
                  {item.title}
                  <CloseIcon
                    sx={{ fontSize: 15, fontWeight: 700 }}
                    className={twMerge(
                      "ml-[4px] mr-[-4px] md:ml-[8px] md:mr-[-8px]",
                      !item.isActive && "hidden",
                    )}
                    onClick={() => handleClickClose(item)}
                  />
                </BaseText>
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
              <MenuItem onClick={() => handleClickCloseMenu(currentEl)}>닫기</MenuItem>
              <MenuItem onClick={() => handleClickCloseOuters(currentEl)}>나머지 닫기</MenuItem>
              <MenuItem onClick={() => handleClickCloseAll(currentEl)}>모두 닫기</MenuItem>
            </Menu>
          </Fragment>
        ))}
      </div>
      <Container className="min-h-screen flex-1 text-white sm:p-2 md:p-5 xs:px-0 xs:py-3">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
