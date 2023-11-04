"use client";

import { IHaveChildren } from "@/models/common";
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
  { key: "2", name: "Help", items: [] },
];

const Menubar = ({ children }: IHaveChildren) => {
  const [openedMenu, setOpenedMenu] = useState("");

  return (
    <>
      <div className="bg-gray-900 p-1 flex">
        {MENULIST.map((item, index) => {
          return (
            <div key={`${item.key}_${index}`}>
              <Typography
                variant="body1"
                color="initial"
                className="text-gray-300 px-3 select-none"
              >
                {item.name}
              </Typography>
            </div>
          );
        })}
      </div>

      {children}
    </>
  );
};

export default Menubar;
