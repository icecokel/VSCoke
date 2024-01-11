"use client";

import BaseText from "../baseUi/Text";
import { IHaveChildren } from "@/models/common";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { MouseEventHandler, useState } from "react";

interface IMenuItem {
  name: string;
  shortcut?: string;
  items?: IMenuItem[];
}

interface IMenu {
  key: string;
  name: string;
  items: IMenuItem[];
}

const MENULIST: IMenu[] = [
  { key: "1", name: "File", items: [{ name: "Open Project" }] },
  { key: "2", name: "Help", items: [{ name: "준비 중 ..." }] },
];

const Menubar = ({ children }: IHaveChildren) => {
  const [currentEl, setCurrentEl] = useState<null | HTMLElement>(null);
  const currentItems = MENULIST.find(({ name }) => name === currentEl?.id);
  const open = Boolean(currentEl);

  const onClose = () => {
    setCurrentEl(null);
  };

  const handleClickMenu: MouseEventHandler<HTMLDivElement> = event => {
    event.preventDefault();
    setCurrentEl(event.currentTarget);
  };

  return (
    <>
      <div className="bg-gray-900 p-1 flex border-b-2 border-b-gray-500">
        {MENULIST.map((item, index) => {
          return (
            <div key={`${item.key}_${index}`} onClick={handleClickMenu} id={item.name}>
              <BaseText type="body1" className="text-gray-300 px-3 select-none">
                {item.name}
              </BaseText>
            </div>
          );
        })}
      </div>
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
        {currentItems?.items.map((item, index) => {
          return <MenuItem key={`${currentItems.name}_item_${index}`}>{item.name}</MenuItem>;
        })}
      </Menu>

      {children}
    </>
  );
};

export default Menubar;
